import { beforeEach, describe, expect, it, vi } from "vitest";
import { tokenManager } from "./token-manager";

function createJwt(expSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      userId: "u1",
      role: "USER",
      tier: "FREE",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
      jti: "jti-test",
    }),
  ).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("token-manager refresh resilience", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "csrfToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    tokenManager.clearTokens();
    vi.restoreAllMocks();
  });

  it("prefers csrf token from cookie over localStorage", async () => {
    localStorage.setItem("csrfToken", "storage-csrf");
    document.cookie = "csrfToken=cookie-csrf; path=/";

    localStorage.setItem("accessToken", createJwt(600));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    );

    await tokenManager.refreshAccessToken();

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["X-CSRF-Token"]).toBe("cookie-csrf");
  });

  it("keeps current session when refresh fails but access token is still valid", async () => {
    const validToken = createJwt(600);
    localStorage.setItem("accessToken", validToken);
    localStorage.setItem("csrfToken", "csrf-valid");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    );

    const token = await tokenManager.refreshAccessToken();
    expect(token).toBe(validToken);
    expect(localStorage.getItem("accessToken")).toBe(validToken);
  });

  it("clears tokens when refresh fails and access token is expired", async () => {
    localStorage.setItem("accessToken", createJwt(-10));
    localStorage.setItem("csrfToken", "csrf-expired");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    await expect(tokenManager.refreshAccessToken()).rejects.toThrow("Token refresh failed (401)");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("csrfToken")).toBeNull();
  });

  it("keeps token and releases lock when refresh request throws network error", async () => {
    const validToken = createJwt(600);
    localStorage.setItem("accessToken", validToken);
    localStorage.setItem("csrfToken", "csrf-valid");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(tokenManager.refreshAccessToken()).rejects.toThrow("network down");
    expect(localStorage.getItem("accessToken")).toBe(validToken);
    expect(localStorage.getItem("token_refresh_lock")).toBeNull();
  });

  it("waits for another tab refresh when lock is held", async () => {
    localStorage.setItem("token_refresh_lock", JSON.stringify({ timestamp: Date.now() }));
    const tokenFromOtherTab = createJwt(900);

    const refreshPromise = tokenManager.refreshAccessToken();
    window.dispatchEvent(new StorageEvent("storage", { key: "accessToken", newValue: tokenFromOtherTab }));

    await expect(refreshPromise).resolves.toBe(tokenFromOtherTab);
  });
});
