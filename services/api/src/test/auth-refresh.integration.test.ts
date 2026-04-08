import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { buildServer } from "../server";
import { appConfig } from "../config";
import crypto from "crypto";

const TEST_EMAIL = "test-refresh@test.local";
const TEST_PASSWORD = "Password123";
let ipSeq = 10;

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const payload = token.split(".")[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(normalized, "base64").toString("utf-8"));
};

const resetDb = async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
};

describe("Auth Refresh Token Integration", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb();
  });

  const registerAndLogin = async (options?: { ip?: string; forwardedHost?: string; userAgent?: string }) => {
    const testIp = options?.ip ?? `10.10.10.${ipSeq++}`;
    const forwardedHost = options?.forwardedHost;
    const userAgent = options?.userAgent ?? "auth-refresh-integration";

    const registerReq = request(app.server)
      .post("/auth/register")
      .set("x-forwarded-for", testIp)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    if (forwardedHost) {
      registerReq.set("x-forwarded-host", forwardedHost);
    }
    await registerReq;

    // Refresh tests target token lifecycle, so mark email as verified explicitly.
    await prisma.user.update({
      where: { email: TEST_EMAIL },
      data: { emailVerified: new Date() }
    });

    const loginReq = request(app.server)
      .post("/auth/login")
      .set("x-forwarded-for", testIp)
      .set("user-agent", userAgent)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, rememberMe: true });
    if (forwardedHost) {
      loginReq.set("x-forwarded-host", forwardedHost);
    }
    const res = await loginReq;

    const setCookie = res.headers["set-cookie"] as string[] | undefined;
    const refreshTokenCookie = setCookie?.find((cookie) => cookie.startsWith("refreshToken="));
    const csrfTokenCookie = setCookie?.find((cookie) => cookie.startsWith("csrfToken="));

    expect(res.status).toBe(200);
    expect(refreshTokenCookie).toBeDefined();
    expect(csrfTokenCookie).toBeDefined();
    expect(res.body.csrfToken).toBeDefined();

    const refreshToken = refreshTokenCookie!.split(";")[0].split("=")[1];
    const csrfToken = res.body.csrfToken as string;

    return { accessToken: res.body.token as string, refreshToken, csrfToken, setCookie };
  };

  it("should return new access token and rotate refresh token with valid cookie + csrf", async () => {
    const { refreshToken: oldRefreshToken, csrfToken } = await registerAndLogin();

    const res = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${oldRefreshToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.csrfToken).toBeDefined();
    const jwtPayload = decodeJwtPayload(res.body.token);
    expect(jwtPayload.userId).toBeDefined();
    expect(jwtPayload.id).toBe(jwtPayload.userId);
    expect(jwtPayload.email).toBe(TEST_EMAIL);

    const rotatedCookies = res.headers["set-cookie"] as string[] | undefined;
    const rotatedRefreshCookie = rotatedCookies?.find((cookie) => cookie.startsWith("refreshToken="));
    expect(rotatedRefreshCookie).toBeDefined();

    const newRefreshToken = rotatedRefreshCookie!.split(";")[0].split("=")[1];
    expect(newRefreshToken).not.toBe(oldRefreshToken);

    // Verify DB state
    const oldHash = crypto.createHash("sha256").update(oldRefreshToken).digest("hex");
    const oldTokenRecord = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
    expect(oldTokenRecord?.usedAt).not.toBeNull();

    const newHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    const newTokenRecord = await prisma.refreshToken.findUnique({ where: { tokenHash: newHash } });
    expect(newTokenRecord).toBeDefined();
    expect(newTokenRecord?.familyId).toBe(oldTokenRecord?.familyId);
  });

  it("should prefer the latest refreshToken when duplicate cookie names are sent", async () => {
    const { refreshToken, csrfToken } = await registerAndLogin();

    const res = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=legacy-revoked-token`, `refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("should return 401 when refresh token cookie is missing", async () => {
    const { csrfToken } = await registerAndLogin();

    const res = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("No refresh token");
  });

  it("should return 403 when csrf header is missing", async () => {
    const { refreshToken, csrfToken } = await registerAndLogin();

    const res = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("CSRF token");
  });

  it("should return 403 when csrf header mismatches cookie", async () => {
    const { refreshToken, csrfToken } = await registerAndLogin();

    const res = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", "mismatch-token");

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("CSRF token mismatch");
  });

  it("should preserve remember-me ttl (30d) on login and rotation cookies", async () => {
    const { refreshToken, csrfToken, setCookie } = await registerAndLogin();

    const loginRefreshCookie = setCookie?.find((cookie) => cookie.startsWith("refreshToken="));
    expect(loginRefreshCookie).toContain("Max-Age=2592000");
    const loginLegacyClearCookie = setCookie?.find(
      (cookie) => cookie.startsWith("refreshToken=") && cookie.includes("Path=/auth/refresh")
    );
    expect(loginLegacyClearCookie).toBeDefined();
    expect(loginLegacyClearCookie).toMatch(/(?:Max-Age=0|Expires=)/i);

    const refreshRes = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(refreshRes.status).toBe(200);
    const rotatedCookies = refreshRes.headers["set-cookie"] as string[] | undefined;
    const rotatedRefreshCookie = rotatedCookies?.find((cookie) => cookie.startsWith("refreshToken="));
    expect(rotatedRefreshCookie).toContain("Max-Age=2592000");
    const rotatedLegacyClearCookie = rotatedCookies?.find(
      (cookie) => cookie.startsWith("refreshToken=") && cookie.includes("Path=/auth/refresh")
    );
    expect(rotatedLegacyClearCookie).toBeDefined();
    expect(rotatedLegacyClearCookie).toMatch(/(?:Max-Age=0|Expires=)/i);
  });

  it("should return 401 with expired refresh token", async () => {
    const { refreshToken } = await registerAndLogin();
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // Force expire in DB
    await prisma.refreshToken.update({
      where: { tokenHash: hash },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    const res = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=expired-csrf`])
      .set("x-csrf-token", "expired-csrf");

    expect(res.status).toBe(401);
  });

  it("should detect refresh token reuse and revoke the token family", async () => {
    const { refreshToken: originalToken, csrfToken } = await registerAndLogin();

    const firstRefresh = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${originalToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(firstRefresh.status).toBe(200);
    const firstCookies = firstRefresh.headers["set-cookie"] as string[] | undefined;
    const rotatedRefreshCookie = firstCookies?.find((cookie) => cookie.startsWith("refreshToken="));
    expect(rotatedRefreshCookie).toBeDefined();
    const rotatedToken = rotatedRefreshCookie!.split(";")[0].split("=")[1];
    const rotatedCsrf = firstRefresh.body.csrfToken as string;

    // Move usedAt out of grace window so second use is treated as replay attack.
    const originalHash = crypto.createHash("sha256").update(originalToken).digest("hex");
    await prisma.refreshToken.update({
      where: { tokenHash: originalHash },
      data: { usedAt: new Date(Date.now() - 5 * 60 * 1000) }
    });

    const reuseAttempt = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${originalToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(reuseAttempt.status).toBe(401);

    const rotatedTokenAttempt = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${rotatedToken}`, `csrfToken=${rotatedCsrf}`])
      .set("x-csrf-token", rotatedCsrf);

    expect(rotatedTokenAttempt.status).toBe(401);
  });

  it("should not revoke token family for delayed concurrent reuse within grace window", async () => {
    const { refreshToken: originalToken, csrfToken } = await registerAndLogin();

    const firstRefresh = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${originalToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(firstRefresh.status).toBe(200);
    const firstCookies = firstRefresh.headers["set-cookie"] as string[] | undefined;
    const rotatedRefreshCookie = firstCookies?.find((cookie) => cookie.startsWith("refreshToken="));
    expect(rotatedRefreshCookie).toBeDefined();
    const rotatedToken = rotatedRefreshCookie!.split(";")[0].split("=")[1];
    const rotatedCsrf = firstRefresh.body.csrfToken as string;

    // Simulate a slow second tab retrying the old token within grace window.
    const originalHash = crypto.createHash("sha256").update(originalToken).digest("hex");
    await prisma.refreshToken.update({
      where: { tokenHash: originalHash },
      data: { usedAt: new Date(Date.now() - 20 * 1000) }
    });

    const oldTokenRetry = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${originalToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(oldTokenRetry.status).toBe(401);

    const rotatedTokenStillWorks = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${rotatedToken}`, `csrfToken=${rotatedCsrf}`])
      .set("x-csrf-token", rotatedCsrf);

    expect(rotatedTokenStillWorks.status).toBe(200);
  });

  it("should allow only one successful rotation for concurrent refresh requests", async () => {
    const { refreshToken, csrfToken } = await registerAndLogin();

    const refreshCall = () =>
      request(app.server)
        .post("/auth/refresh")
        .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`])
        .set("x-csrf-token", csrfToken);

    const [first, second] = await Promise.all([refreshCall(), refreshCall()]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 401]);

    const oldHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const oldTokenRecord = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
    expect(oldTokenRecord?.usedAt).not.toBeNull();

    const activeChildrenCount = await prisma.refreshToken.count({
      where: {
        familyId: oldTokenRecord!.familyId,
        revokedAt: null,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });
    expect(activeChildrenCount).toBe(1);
  });

  it("should return 401 if user is deleted after login", async () => {
    const { refreshToken, csrfToken } = await registerAndLogin();

    await prisma.user.delete({ where: { email: TEST_EMAIL } });

    const res = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(res.status).toBe(401);
    expect(typeof res.body.error).toBe("string");
  });

  it("should revoke refresh token server-side on logout", async () => {
    const { accessToken, refreshToken, csrfToken } = await registerAndLogin();
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const logoutRes = await request(app.server)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`]);

    expect(logoutRes.status).toBe(200);

    const tokenRecord = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    expect(tokenRecord?.revokedAt).not.toBeNull();

    const refreshRes = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(refreshRes.status).toBe(401);
  });

  it("should clear csrf cookie with matching domain on logout when shared domain is used", async () => {
    const forwardedHost = new URL(appConfig.webUrl).hostname;
    const { accessToken, refreshToken, csrfToken, setCookie } = await registerAndLogin({ forwardedHost });

    const loginCsrfCookie = setCookie?.find((cookie) => cookie.startsWith("csrfToken="));
    expect(loginCsrfCookie).toBeDefined();

    const logoutRes = await request(app.server)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-forwarded-host", forwardedHost)
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`]);

    expect(logoutRes.status).toBe(200);

    const logoutCookies = logoutRes.headers["set-cookie"] as string[] | undefined;
    const clearedCsrfCookie = logoutCookies?.find((cookie) => cookie.startsWith("csrfToken="));
    expect(clearedCsrfCookie).toBeDefined();

    const loginDomainMatch = loginCsrfCookie!.match(/Domain=([^;]+)/i);
    if (loginDomainMatch) {
      expect(clearedCsrfCookie).toContain(`Domain=${loginDomainMatch[1]}`);
    }
    expect(clearedCsrfCookie).toMatch(/(?:Max-Age=0|Expires=)/i);
  });

  it("should keep another session active when logging out current session", async () => {
    const sessionA = await registerAndLogin();

    const ipB = `10.10.20.${ipSeq++}`;
    const loginB = await request(app.server)
      .post("/auth/login")
      .set("x-forwarded-for", ipB)
      .set("user-agent", "session-b-agent")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, rememberMe: true });

    expect(loginB.status).toBe(200);
    const setCookieB = loginB.headers["set-cookie"] as string[] | undefined;
    const refreshCookieB = setCookieB?.find((cookie) => cookie.startsWith("refreshToken="));
    const csrfCookieB = setCookieB?.find((cookie) => cookie.startsWith("csrfToken="));
    expect(refreshCookieB).toBeDefined();
    expect(csrfCookieB).toBeDefined();

    const refreshTokenB = refreshCookieB!.split(";")[0].split("=")[1];
    const csrfTokenB = loginB.body.csrfToken as string;

    const logoutA = await request(app.server)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${sessionA.accessToken}`)
      .set("Cookie", [`refreshToken=${sessionA.refreshToken}`, `csrfToken=${sessionA.csrfToken}`]);

    expect(logoutA.status).toBe(200);

    const refreshB = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshTokenB}`, `csrfToken=${csrfTokenB}`])
      .set("x-csrf-token", csrfTokenB);

    expect(refreshB.status).toBe(200);
  });

  it("should block refresh and revoke user sessions when account is disabled", async () => {
    const { refreshToken, csrfToken } = await registerAndLogin();
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).toBeDefined();

    await prisma.user.update({
      where: { id: user!.id },
      data: { isDisabled: true }
    });

    const res = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("disabled");

    const activeTokens = await prisma.refreshToken.count({
      where: { userId: user!.id, revokedAt: null }
    });
    expect(activeTokens).toBe(0);
  });

  it("should enforce refresh rate limit by client IP", async () => {
    const ip = `10.20.30.${ipSeq++}`;
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app.server)
        .post("/auth/refresh")
        .set("x-forwarded-for", ip)
        .set("Cookie", ["csrfToken=rate-limit-csrf"])
        .set("x-csrf-token", "rate-limit-csrf");
      expect([401, 403]).toContain(res.status);
    }

    const blocked = await request(app.server)
      .post("/auth/refresh")
      .set("x-forwarded-for", ip)
      .set("Cookie", ["csrfToken=rate-limit-csrf"])
      .set("x-csrf-token", "rate-limit-csrf");

    expect(blocked.status).toBe(429);
  });

  it("should write auth.token_refresh audit log on successful refresh", async () => {
    const { refreshToken, csrfToken } = await registerAndLogin();

    const res = await request(app.server)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`, `csrfToken=${csrfToken}`])
      .set("x-csrf-token", csrfToken);

    expect(res.status).toBe(200);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "auth.token_refresh" }
    });
    expect(audit).toBeDefined();
  });
});
