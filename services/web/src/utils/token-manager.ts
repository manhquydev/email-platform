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

class TokenManager {
  private refreshPromise: Promise<string> | null = null;

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    // Phase 4: Refresh token now stored in httpOnly cookie, not localStorage
    // This method returns null - cookies are handled automatically by browser
    return null;
  }

  setTokens(accessToken: string, _refreshToken: string): void {
    // Phase 4: Only store access token in localStorage
    // Refresh token is stored as httpOnly cookie by backend
    localStorage.setItem('accessToken', accessToken);
  }

  clearTokens(): void {
    // Phase 4: Clear access token from localStorage
    // Cookies will be cleared by backend /auth/logout endpoint
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken'); // Cleanup old storage
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

  // Phase 4: Read CSRF token from cookie for double-submit pattern
  private getCsrfToken(): string {
    const match = document.cookie.match(/csrfToken=([^;]+)/);
    return match ? match[1] : '';
  }

  async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(): Promise<string> {
    const API_BASE = (window as any).env?.API_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001';
    const baseUrl = API_BASE.replace(/\/$/, '');

    // Phase 4: Get CSRF token from cookie for double-submit pattern
    const csrfToken = this.getCsrfToken();

    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Send cookies (httpOnly refreshToken + csrfToken)
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken, // Double-submit pattern
      },
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const data: TokenResponse = await response.json();
    // Phase 4: Store new access token (refresh token updated as cookie automatically)
    localStorage.setItem('accessToken', data.token);
    return data.token;
  }
}

export const tokenManager = new TokenManager();
