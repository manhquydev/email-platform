import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  userId: string;
  role: string;
  tier: string;
  exp: number;
  iat: number;
  jti: string;
}

interface TokenResponse {
  token: string;
  csrfToken: string;
  expiresIn: number;
}

// Cross-tab refresh lock: prevent multiple tabs from refreshing concurrently.
const REFRESH_LOCK_KEY = 'token_refresh_lock';
const REFRESH_LOCK_TIMEOUT_MS = 30_000; // 30 seconds max hold time (network + hidden tab tolerance)

// Non-sensitive marker that a session likely exists (the refresh token is an httpOnly cookie we
// cannot read). It lets a fresh page load decide whether to attempt a silent refresh. It holds
// NO token material — only the literal '1'.
const SESSION_FLAG_KEY = 'auth:hasSession';

class TokenManager {
  private refreshPromise: Promise<string> | null = null;

  // Access and CSRF tokens live ONLY in memory — never localStorage/sessionStorage — so an XSS
  // payload cannot read them. The refresh token remains an httpOnly cookie owned by the server.
  private accessToken: string | null = null;
  private csrfToken: string | null = null;

  // BroadcastChannel shares a freshly-refreshed token across tabs (replaces the previous
  // localStorage `storage` event mechanism, which only worked because the token was persisted).
  private channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('token_manager_sync') : null;

  constructor() {
    this.channel?.addEventListener('message', (ev: MessageEvent) => {
      const data = ev.data as { type?: string; token?: string; csrf?: string };
      if (data?.type === 'token' && data.token) {
        this.accessToken = data.token;
        if (data.csrf) this.csrfToken = data.csrf;
      } else if (data?.type === 'clear') {
        this.accessToken = null;
        this.csrfToken = null;
      }
    });
  }

  hasSessionFlag(): boolean {
    try {
      return localStorage.getItem(SESSION_FLAG_KEY) === '1';
    } catch {
      return false;
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    // Refresh token stored in httpOnly cookie - not accessible from JS
    return null;
  }

  setTokens(accessToken: string, _refreshToken?: string): void {
    this.accessToken = accessToken;
    try {
      localStorage.setItem(SESSION_FLAG_KEY, '1');
    } catch {
      // storage may be unavailable (private mode) — in-memory token still works for this tab
    }
    this.channel?.postMessage({ type: 'token', token: accessToken, csrf: this.csrfToken ?? undefined });
  }

  setCsrfToken(token: string): void {
    this.csrfToken = token;
    // Only broadcast alongside a real access token — receiving tabs ignore empty tokens, and the
    // CSRF cookie is already shared cross-tab as the authoritative double-submit source.
    if (this.accessToken) {
      this.channel?.postMessage({ type: 'token', token: this.accessToken, csrf: token });
    }
  }

  clearTokens(): void {
    this.accessToken = null;
    this.csrfToken = null;
    try {
      localStorage.removeItem(SESSION_FLAG_KEY);
      // Clean up any tokens persisted by older builds.
      localStorage.removeItem('accessToken');
      localStorage.removeItem('csrfToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('token');
      localStorage.removeItem(REFRESH_LOCK_KEY);
    } catch {
      // ignore
    }
    this.refreshPromise = null;
    this.channel?.postMessage({ type: 'clear' });
  }

  isTokenExpiringSoon(token: string, thresholdSeconds = 300): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp - now < thresholdSeconds;
    } catch {
      return true;
    }
  }

  // CSRF token: prefer the cookie (server-side source of truth for /auth/refresh double-submit
  // validation), then the in-memory copy.
  getCsrfToken(): string {
    const fromCookie = document.cookie.match(/csrfToken=([^;]+)/);
    if (fromCookie) return fromCookie[1];
    return this.csrfToken || '';
  }

  // Acquire cross-tab refresh lock. Returns true if lock acquired, false if another tab holds it.
  private acquireRefreshLock(): boolean {
    const existing = localStorage.getItem(REFRESH_LOCK_KEY);
    if (existing) {
      try {
        const { timestamp } = JSON.parse(existing) as { timestamp: number };
        if (Date.now() - timestamp < REFRESH_LOCK_TIMEOUT_MS) {
          return false; // Another tab holds the lock
        }
      } catch {
        localStorage.removeItem(REFRESH_LOCK_KEY);
      }
    }
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ timestamp: Date.now() }));
    return true;
  }

  private releaseRefreshLock(): void {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  }

  // Wait for another tab to broadcast its freshly-refreshed access token.
  private waitForOtherTabRefresh(): Promise<string> {
    return new Promise((resolve, reject) => {
      const channel = this.channel;
      if (!channel) {
        // No cross-tab channel available — refresh ourselves.
        this.refreshPromise = null;
        this.refreshAccessToken().then(resolve).catch(reject);
        return;
      }

      const onMessage = (ev: MessageEvent) => {
        const data = ev.data as { type?: string; token?: string };
        if (data?.type === 'token' && data.token) {
          cleanup();
          resolve(data.token);
        }
      };
      const cleanup = () => {
        clearTimeout(deadline);
        channel.removeEventListener('message', onMessage);
      };

      const deadline = setTimeout(() => {
        cleanup();
        // If we already hold a valid token, keep the session stable.
        if (this.accessToken && !this.isTokenExpiringSoon(this.accessToken, 0)) {
          resolve(this.accessToken);
          return;
        }
        // Lock looks stale -> release and retry ourselves.
        const existingLock = localStorage.getItem(REFRESH_LOCK_KEY);
        if (existingLock) {
          try {
            const { timestamp } = JSON.parse(existingLock) as { timestamp: number };
            if (Date.now() - timestamp >= REFRESH_LOCK_TIMEOUT_MS) {
              localStorage.removeItem(REFRESH_LOCK_KEY);
            }
          } catch {
            localStorage.removeItem(REFRESH_LOCK_KEY);
          }
        }
        this.refreshPromise = null;
        this.refreshAccessToken().then(resolve).catch(reject);
      }, REFRESH_LOCK_TIMEOUT_MS);

      channel.addEventListener('message', onMessage);
    });
  }

  async refreshAccessToken(): Promise<string> {
    // Deduplicate within the same tab
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Cross-tab lock: if another tab is refreshing, wait for it
    if (!this.acquireRefreshLock()) {
      return this.waitForOtherTabRefresh();
    }

    this.refreshPromise = this._doRefresh().finally(() => {
      this.releaseRefreshLock();
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async _doRefresh(): Promise<string> {
    const API_BASE = (window as any).env?.API_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001';
    const baseUrl = API_BASE.replace(/\/$/, '');
    const csrfToken = this.getCsrfToken();

    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Send httpOnly refreshToken cookie
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: '{}',
    });

    if (!response.ok) {
      // Avoid premature logout on transient refresh failures while current token is still valid.
      if (this.accessToken && !this.isTokenExpiringSoon(this.accessToken, 0)) {
        return this.accessToken;
      }
      this.clearTokens();
      throw new Error(`Token refresh failed (${response.status})`);
    }

    const data: TokenResponse = await response.json();
    this.accessToken = data.token;
    if (data.csrfToken) {
      this.csrfToken = data.csrfToken;
    }
    try {
      localStorage.setItem(SESSION_FLAG_KEY, '1');
    } catch {
      // ignore
    }
    // Share the new token with other tabs.
    this.channel?.postMessage({ type: 'token', token: data.token, csrf: data.csrfToken });
    return data.token;
  }
}

export const tokenManager = new TokenManager();
