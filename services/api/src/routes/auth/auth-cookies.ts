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

/**
 * Fastify cookie parser keeps the first duplicate key, while browsers can send
 * both legacy (/auth/refresh) and current (/auth) refreshToken cookies.
 * We intentionally read the last occurrence to prefer the current cookie.
 */
export function getLatestCookieValue(request: FastifyRequest, cookieName: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;

  let latest: string | undefined;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const name = trimmed.slice(0, separatorIndex).trim();
    if (name !== cookieName) continue;

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!rawValue) continue;

    try {
      latest = decodeURIComponent(rawValue);
    } catch {
      latest = rawValue;
    }
  }

  return latest;
}

export function getRefreshTokenFromRequest(request: FastifyRequest): string | undefined {
  const latest = getLatestCookieValue(request, "refreshToken");
  if (latest) return latest;
  const cookies = request.cookies as { refreshToken?: string };
  return cookies.refreshToken;
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

  // Clear legacy refresh cookie path so old revoked tokens are not sent first.
  reply.clearCookie("refreshToken", { path: LEGACY_REFRESH_COOKIE_PATH });
}
