import { FastifyInstance } from "fastify";
import { SamlService } from "../_wip/identity/saml-sp";
import { OidcService } from "../_wip/identity/oidc-client";
import { provisionUser } from "../_wip/identity/jit-provisioning";
import { appConfig } from "../config";
import { sendApiError } from "../utils/errorHandler";
import { RefreshTokenService } from "../services/refresh-token.service";
import { createCsrfToken } from "./auth/auth-tokens";
import { setAuthCookies } from "./auth/auth-cookies";
import { COOKIE_MAX_AGE_DEFAULT } from "./auth/auth-config";

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

      // Establish a session via httpOnly cookies (opaque DB refresh token + CSRF), matching
      // the login flow. The access token is fetched by the client via /auth/refresh after the
      // redirect — it is never placed in the URL (which leaks to logs/Referer/history).
      const { token: refreshToken } = await RefreshTokenService.createToken(
        user.id, 7, request.headers["user-agent"], request.ip
      );
      const csrfToken = createCsrfToken();
      setAuthCookies(reply, request, refreshToken, csrfToken, COOKIE_MAX_AGE_DEFAULT);

      return reply.redirect(`${appConfig.webUrl}/auth/sso?success=true`);
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

      // Establish a session via httpOnly cookies (opaque DB refresh token + CSRF). The access
      // token is fetched by the client via /auth/refresh after the redirect — never in the URL.
      const { token: refreshToken } = await RefreshTokenService.createToken(
        user.id, 7, request.headers["user-agent"], request.ip
      );
      const csrfToken = createCsrfToken();
      setAuthCookies(reply, request, refreshToken, csrfToken, COOKIE_MAX_AGE_DEFAULT);

      return reply.redirect(`${appConfig.webUrl}/auth/sso?success=true`);
    } catch (err) {
      request.log.error(err);
      return reply.redirect(`${appConfig.webUrl}/login?error=oidc_failed`);
    }
  });
}
