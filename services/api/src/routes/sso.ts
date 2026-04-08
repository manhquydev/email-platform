import { FastifyInstance } from "fastify";
import { z } from "zod";
import { SamlService } from "../_wip/identity/saml-sp";
import { OidcService } from "../_wip/identity/oidc-client";
import { provisionUser } from "../_wip/identity/jit-provisioning";
import { appConfig } from "../config";
import { sendApiError } from "../utils/errorHandler";
import crypto from "crypto";

export async function ssoRoutes(app: FastifyInstance) {
  // SAML Login
  app.get("/sso/saml/:providerId/login", async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    try {
      const service = await SamlService.getProvider(providerId);
      const loginUrl = await service.getAuthorizeUrl(request.headers.host);
      return reply.redirect(loginUrl);
    } catch (err) {
      request.log.error(err);
      return sendApiError(reply, 400, "SSO initiation failed", { code: "BAD_REQUEST" });
    }
  });

  // SAML ACS (Assertion Consumer Service)
  app.post("/sso/saml/:providerId/acs", async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    try {
      const service = await SamlService.getProvider(providerId);
      const { profile } = await service.validatePostResponse(request.body);

      if (!profile || !profile.email) {
        throw new Error("SAML assertion missing email");
      }

      const user = await provisionUser(
        providerId,
        profile.nameID || profile.email,
        profile.email,
        profile
      );

      // Issue JWTs (Similar to auth.ts)
      const accessJti = crypto.randomUUID();
      const refreshJti = crypto.randomUUID();
      const accessToken = app.jwt.sign(
        { userId: user.id, role: user.role, tier: user.tier, type: "access", jti: accessJti },
        { expiresIn: "15m" }
      );
      const refreshToken = app.jwt.sign(
        { userId: user.id, type: "refresh", jti: refreshJti },
        { expiresIn: "7d" }
      );

      // Redirect to frontend with tokens
      const redirectUrl = `${appConfig.webUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`;
      return reply.redirect(redirectUrl);
    } catch (err) {
      request.log.error(err);
      return reply.redirect(`${appConfig.webUrl}/login?error=saml_failed`);
    }
  });

  // OIDC Login
  app.get("/sso/oidc/:providerId/login", async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    try {
      const service = await OidcService.getProvider(providerId);
      return reply.redirect(service.getAuthorizationUrl());
    } catch (err) {
      request.log.error(err);
      return sendApiError(reply, 400, "SSO initiation failed", { code: "BAD_REQUEST" });
    }
  });

  // OIDC Callback
  app.get("/sso/oidc/:providerId/callback", async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    try {
      const service = await OidcService.getProvider(providerId);
      const userInfo = await service.callback(request.query);

      const user = await provisionUser(
        providerId,
        userInfo.sub,
        userInfo.email,
        userInfo
      );

      // Issue JWTs
      const accessJti = crypto.randomUUID();
      const refreshJti = crypto.randomUUID();
      const accessToken = app.jwt.sign(
        { userId: user.id, role: user.role, tier: user.tier, type: "access", jti: accessJti },
        { expiresIn: "15m" }
      );
      const refreshToken = app.jwt.sign(
        { userId: user.id, type: "refresh", jti: refreshJti },
        { expiresIn: "7d" }
      );

      const redirectUrl = `${appConfig.webUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`;
      return reply.redirect(redirectUrl);
    } catch (err) {
      request.log.error(err);
      return reply.redirect(`${appConfig.webUrl}/login?error=oidc_failed`);
    }
  });
}
