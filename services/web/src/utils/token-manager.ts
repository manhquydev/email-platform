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

// Cross-tab refresh lock: prevent multiple tabs from refreshing concurrently
const REFRESH_LOCK_KEY = 'token_refresh_lock';
const REFRESH_LOCK_TIMEOUT_MS = 10_000; // 10 seconds max hold time

class TokenManager {
  private refreshPromise: Promise<string> | null = null;

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    // Refresh token stored in httpOnly cookie - not accessible from JS
    return null;
  }

  setTokens(accessToken: string, _refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
  }

  // Store CSRF token in localStorage (cookie approach fails cross-subdomain)
  setCsrfToken(token: string): void {
    localStorage.setItem('csrfToken', token);
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken'); // Cleanup old storage key
    localStorage.removeItem('csrfToken');
    localStorage.removeItem(REFRESH_LOCK_KEY);
    this.refreshPromise = null;
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

  // CSRF token: prefer cookie, then fall back to localStorage.
  // Cookie is server-side source-of-truth for /auth/refresh validation.
  private getCsrfToken(): string {
    const fromCookie = document.cookie.match(/csrfToken=([^;]+)/);
    if (fromCookie) return fromCookie[1];
    const fromStorage = localStorage.getItem('csrfToken');
    return fromStorage || '';
  }

  // Acquire cross-tab refresh lock. Returns true if lock acquired, false if another tab holds it.
  private acquireRefreshLock(): boolean {
    const existing = localStorage.getItem(REFRESH_LOCK_KEY);
    if (existing) {
      const { timestamp } = JSON.parse(existing) as { timestamp: number };
      if (Date.now() - timestamp < REFRESH_LOCK_TIMEOUT_MS) {
        return false; // Another tab holds the lock
      }
    }
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ timestamp: Date.now() }));
    return true;
  }

  private releaseRefreshLock(): void {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  }

  // Wait for another tab to complete its refresh, then return the updated access token.
  private waitForOtherTabRefresh(): Promise<string> {
    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        window.removeEventListener('storage', handler);
        // Timeout: other tab may have failed - try refreshing ourselves
        this.refreshPromise = null;
        this.refreshAccessToken().then(resolve).catch(reject);
      }, REFRESH_LOCK_TIMEOUT_MS);

      const handler = (event: StorageEvent) => {
        if (event.key === 'accessToken' && event.newValue) {
          // Another tab stored a fresh access token
          clearTimeout(deadline);
          window.removeEventListener('storage', handler);
          // Also sync the CSRF token if updated
          resolve(event.newValue);
        } else if (event.key === REFRESH_LOCK_KEY && !event.newValue) {
          // Lock released - check for fresh token
          const token = this.getAccessToken();
          if (token) {
            clearTimeout(deadline);
            window.removeEventListener('storage', handler);
            resolve(token);
          }
        }
      };

      window.addEventListener('storage', handler);
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
    });

    if (!response.ok) {
      // Avoid premature logout on transient refresh failures while current access token is still valid.
      // This keeps active sessions stable and lets next refresh attempt recover.
      const existingToken = this.getAccessToken();
      if (existingToken && !this.isTokenExpiringSoon(existingToken, 0)) {
        return existingToken;
      }
      this.clearTokens();
      throw new Error(`Token refresh failed (${response.status})`);
    }

    const data: TokenResponse = await response.json();
    // Store new access token (triggers storage event in other tabs)
    localStorage.setItem('accessToken', data.token);
    // Update CSRF token for subsequent refreshes
    if (data.csrfToken) {
      localStorage.setItem('csrfToken', data.csrfToken);
    }
    return data.token;
  }
}

export const tokenManager = new TokenManager();
