import type { FastifyReply, FastifyRequest } from "fastify";
import { appConfig } from "../../config";
import { COOKIE_MAX_AGE_DEFAULT, LEGACY_REFRESH_COOKIE_PATH, REFRESH_COOKIE_PATH } from "./auth-config";

/**
 * Returns the shared parent domain for cookies (e.g. ".manhquy.click") so
 * the csrfToken cookie set by api.{domain} is readable by app.{domain}.
 * Returns undefined for localhost/IP (no subdomain sharing needed).
 */
export function getCookieDomain(_requestHost?: string): string | undefined {
  try {
    const { hostname } = new URL(appConfig.webUrl);
    if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;
    const parts = hostname.split(".");
    const configuredDomain = parts.length >= 2 ? "." + parts.slice(-2).join(".") : undefined;
    return configuredDomain || undefined;
  } catch {
    return undefined;
  }
}

export function getEffectiveRequestHost(request: FastifyRequest): string | undefined {
  const forwardedHost = request.headers["x-forwarded-host"];
  if (typeof forwardedHost === "string" && forwardedHost.trim()) {
    return forwardedHost.split(",")[0].trim();
  }
  if (Array.isArray(forwardedHost) && forwardedHost.length > 0) {
    return forwardedHost[0];
  }
  return request.hostname;
}

export function clearRefreshCookies(reply: FastifyReply) {
  reply.clearCookie("refreshToken", { path: REFRESH_COOKIE_PATH });
  // Backward compatibility for cookies created before path migration.
  reply.clearCookie("refreshToken", { path: LEGACY_REFRESH_COOKIE_PATH });
}

export function clearCsrfCookie(reply: FastifyReply, request: FastifyRequest) {
  const csrfDomain = getCookieDomain(getEffectiveRequestHost(request));
  reply.clearCookie("csrfToken", {
    path: "/",
    ...(csrfDomain ? { domain: csrfDomain } : {}),
  });
}

export function setAuthCookies(
  reply: FastifyReply,
  request: FastifyRequest,
  refreshToken: string,
  csrfToken: string,
  maxAge: number = COOKIE_MAX_AGE_DEFAULT,
) {
  reply.setCookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: REFRESH_COOKIE_PATH,
  });

  const csrfDomain = getCookieDomain(getEffectiveRequestHost(request));
  reply.setCookie("csrfToken", csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge,
    path: "/",
    ...(csrfDomain ? { domain: csrfDomain } : {}),
  });
}
