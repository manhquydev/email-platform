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

  it("prefers csrf token from cookie over in-memory value", async () => {
    tokenManager.setCsrfToken("memory-csrf");
    document.cookie = "csrfToken=cookie-csrf; path=/";

    tokenManager.setTokens(createJwt(600));
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
    expect(options.body).toBe("{}");
  });

  it("keeps current session when refresh fails but access token is still valid", async () => {
    const validToken = createJwt(600);
    tokenManager.setTokens(validToken);
    tokenManager.setCsrfToken("csrf-valid");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    );

    const token = await tokenManager.refreshAccessToken();
    expect(token).toBe(validToken);
    expect(tokenManager.getAccessToken()).toBe(validToken);
  });

  it("clears tokens when refresh fails and access token is expired", async () => {
    tokenManager.setTokens(createJwt(-10));
    tokenManager.setCsrfToken("csrf-expired");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    await expect(tokenManager.refreshAccessToken()).rejects.toThrow("Token refresh failed (401)");
    expect(tokenManager.getAccessToken()).toBeNull();
    expect(tokenManager.hasSessionFlag()).toBe(false);
  });

  it("does not persist the access token to localStorage", async () => {
    tokenManager.setTokens(createJwt(600));
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    // Only the non-sensitive session marker is persisted.
    expect(localStorage.getItem("auth:hasSession")).toBe("1");
  });

  it("keeps token and releases lock when refresh request throws network error", async () => {
    const validToken = createJwt(600);
    tokenManager.setTokens(validToken);
    tokenManager.setCsrfToken("csrf-valid");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(tokenManager.refreshAccessToken()).rejects.toThrow("network down");
    expect(tokenManager.getAccessToken()).toBe(validToken);
    expect(localStorage.getItem("token_refresh_lock")).toBeNull();
  });

  it("waits for another tab to broadcast a refreshed token when lock is held", async () => {
    localStorage.setItem("token_refresh_lock", JSON.stringify({ timestamp: Date.now() }));
    const tokenFromOtherTab = createJwt(900);
    const otherTab = new BroadcastChannel("token_manager_sync");

    const refreshPromise = tokenManager.refreshAccessToken();
    // The waiter attaches its listener synchronously; broadcast the new token from the "other tab".
    otherTab.postMessage({ type: "token", token: tokenFromOtherTab });

    await expect(refreshPromise).resolves.toBe(tokenFromOtherTab);
    otherTab.close();
  });

  it("keeps current token when waiting for other tab times out", async () => {
    vi.useFakeTimers();
    const validToken = createJwt(600);
    tokenManager.setTokens(validToken);
    localStorage.setItem("token_refresh_lock", JSON.stringify({ timestamp: Date.now() }));

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const refreshPromise = tokenManager.refreshAccessToken();
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(refreshPromise).resolves.toBe(validToken);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
