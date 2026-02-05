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
  refreshToken: string;
  expiresIn: number;
}

class TokenManager {
  private refreshPromise: Promise<string> | null = null;

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const API_BASE = (window as any).env?.API_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001';
    const baseUrl = API_BASE.replace(/\/$/, '');

    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const data: TokenResponse = await response.json();
    this.setTokens(data.token, data.refreshToken);
    return data.token;
  }
}

export const tokenManager = new TokenManager();
