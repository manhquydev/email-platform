import { FastifyInstance } from "fastify";
import { z } from "zod";
import Redis from "ioredis";
import { AnonymousSessionService } from "../services/anonymous-session.service";
import { prisma } from "../lib/prisma";
import { appConfig } from "../config";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

// Redis-based challenge store for multi-instance support
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});
const CHALLENGE_PREFIX = "auth:challenge:";
const CHALLENGE_TTL_SECONDS = 300; // 5 minutes

// Async helper functions for Redis challenge store
async function setChallenge(key: string, challenge: string): Promise<void> {
  await redis.set(`${CHALLENGE_PREFIX}${key}`, challenge, "EX", CHALLENGE_TTL_SECONDS);
}

async function getChallenge(key: string): Promise<string | null> {
  return await redis.get(`${CHALLENGE_PREFIX}${key}`);
}

async function deleteChallenge(key: string): Promise<void> {
  await redis.del(`${CHALLENGE_PREFIX}${key}`);
}

// Derive RP ID from webUrl (e.g., "http://localhost:5173" -> "localhost")
function getRpId(): string {
  try {
    const url = new URL(appConfig.webUrl);
    return url.hostname;
  } catch {
    return "localhost";
  }
}

export async function anonymousAuthRoutes(app: FastifyInstance) {
  // POST /auth/anonymous - Create anonymous account (zero PII)
  app.post("/auth/anonymous", async (req, reply) => {
    try {
      const account = await AnonymousSessionService.createAnonymousAccount();

      // Use generic sign to avoid type constraints for anonymous tokens
      const token = (app.jwt.sign as any)({
        anonymousId: account.id,
        accountCode: account.accountCode,
        anonTier: account.tier,
      });

      return reply.send({
        accountCode: account.accountCode,
        visitorToken: account.visitorToken,
        accessToken: token,
      });
    } catch (error) {
      req.log.error(error);
      return reply.status(500).send({ error: "Failed to create anonymous account" });
    }
  });

  // GET /auth/anonymous/me - Get current session info
  app.get("/auth/anonymous/me", {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const user = req.user as any;

    if (!user.anonymousId) {
      return reply.status(401).send({ error: "Not an anonymous session" });
    }

    const account = await AnonymousSessionService.getById(user.anonymousId);
    if (!account) {
      return reply.status(404).send({ error: "Account not found" });
    }

    return reply.send({
      accountCode: account.accountCode,
      tier: account.tier,
      hasPasskey: !!account.passkeyId,
    });
  });

  // POST /auth/anonymous/restore - Restore session from visitor token
  app.post("/auth/anonymous/restore", async (req, reply) => {
    const { visitorToken } = z.object({ visitorToken: z.string() }).parse(req.body);

    const account = await AnonymousSessionService.getByVisitorToken(visitorToken);

    if (!account) {
      return reply.status(401).send({ error: "Invalid visitor token" });
    }

    // Update last seen
    await prisma.anonymousAccount.update({
      where: { id: account.id },
      data: { lastSeenAt: new Date() },
    });

    const token = (app.jwt.sign as any)({
      anonymousId: account.id,
      accountCode: account.accountCode,
      anonTier: account.tier,
    });

    return reply.send({
      accountCode: account.accountCode,
      accessToken: token,
      hasPasskey: !!account.passkeyId,
    });
  });

  // --- Passkey Registration ---

  app.post("/auth/anonymous/passkey/register/options", async (req, reply) => {
    await app.authenticate(req, reply);
    const user = req.user as any;

    if (!user.anonymousId) {
      return reply.status(403).send({ error: "Only anonymous accounts can use this endpoint" });
    }

    const account = await AnonymousSessionService.getById(user.anonymousId);
    if (!account) return reply.status(404).send({ error: "Account not found" });

    const options = await generateRegistrationOptions({
      rpName: "Ephemera Mail",
      rpID: getRpId(),
      userName: `Anonymous ${account.accountCode.substring(0, 9)}`,
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
    });

    // Save challenge with TTL
    await setChallenge(account.id, options.challenge);

    return reply.send(options);
  });

  app.post("/auth/anonymous/passkey/register/verify", async (req, reply) => {
    await app.authenticate(req, reply);
    const user = req.user as any;
    const body = req.body as any;

    const account = await AnonymousSessionService.getById(user.anonymousId);
    if (!account) return reply.status(404).send({ error: "Account not found" });

    const expectedChallenge = await getChallenge(account.id);
    if (!expectedChallenge) {
      return reply.status(400).send({ error: "Challenge expired or not found" });
    }

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: appConfig.webUrl,
      expectedRPID: getRpId(),
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      // Create credential linked to anonymous account
      const passkey = await prisma.passkeyCredential.create({
        data: {
          credentialID: Buffer.from(credential.id).toString("base64url"),
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: BigInt(credential.counter),
          transports: (body.response?.transports as string[]) || [],
        },
      });

      // Link to account
      await AnonymousSessionService.linkPasskey(account.id, passkey.id);

      await deleteChallenge(account.id);
      return reply.send({ success: true });
    }

    return reply.status(400).send({ error: "Verification failed" });
  });

  // --- Passkey Login ---

  app.post("/auth/anonymous/passkey/login/options", async (req, reply) => {
    const { accountCode } = z.object({ accountCode: z.string() }).parse(req.body);

    const account = await AnonymousSessionService.getByAccountCode(accountCode);
    if (!account || !account.passkeyId) {
      return reply.status(404).send({ error: "Account not found or no passkey set" });
    }

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { id: account.passkeyId },
    });

    if (!passkey) return reply.status(404).send({ error: "Passkey data missing" });

    const options = await generateAuthenticationOptions({
      rpID: getRpId(),
      allowCredentials: [
        {
          id: passkey.credentialID,
          transports: passkey.transports as any,
        },
      ],
      userVerification: "preferred",
    });

    await setChallenge(account.accountCode, options.challenge);

    return reply.send(options);
  });

  app.post("/auth/anonymous/passkey/login/verify", async (req, reply) => {
    const { accountCode, response } = z
      .object({
        accountCode: z.string(),
        response: z.any(),
      })
      .parse(req.body);

    const account = await AnonymousSessionService.getByAccountCode(accountCode);
    if (!account || !account.passkeyId) {
      return reply.status(404).send({ error: "Account not found" });
    }

    const expectedChallenge = await getChallenge(accountCode);
    if (!expectedChallenge) {
      return reply.status(400).send({ error: "Challenge expired" });
    }

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { id: account.passkeyId },
    });
    if (!passkey) return reply.status(404).send({ error: "Passkey not found" });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: appConfig.webUrl,
      expectedRPID: getRpId(),
      credential: {
        id: passkey.credentialID,
        publicKey: Buffer.from(passkey.publicKey, "base64url"),
        counter: Number(passkey.counter),
        transports: passkey.transports as any,
      },
    });

    if (verification.verified) {
      // Update counter
      await prisma.passkeyCredential.update({
        where: { id: passkey.id },
        data: {
          counter: BigInt(verification.authenticationInfo.newCounter),
          lastUsedAt: new Date(),
        },
      });

      // Update account last seen
      await prisma.anonymousAccount.update({
        where: { id: account.id },
        data: { lastSeenAt: new Date() },
      });

      const token = (app.jwt.sign as any)({
        anonymousId: account.id,
        accountCode: account.accountCode,
        anonTier: account.tier,
      });

      await deleteChallenge(accountCode);

      return reply.send({
        accessToken: token,
        accountCode: account.accountCode,
      });
    }

    return reply.status(400).send({ error: "Verification failed" });
  });
}
