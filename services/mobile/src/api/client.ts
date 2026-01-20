import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.ephemera.app';

/** Token storage keys */
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public requires2FA?: boolean
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | undefined>;
  /** Skip token refresh on 401 (used internally) */
  _skipRefresh?: boolean;
}

/**
 * API Client with automatic token refresh on 401 errors.
 * Uses SecureStore for encrypted token persistence.
 */
class ApiClient {
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private initialized = false;
  private refreshPromise: Promise<string | null> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.token = await SecureStore.getItemAsync(TOKEN_KEY);
      this.refreshTokenValue = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load auth tokens:', error);
      this.initialized = true;
    }
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.initialized) {
      await this.init();
    }

    const { query, _skipRefresh, ...fetchOptions } = options;

    // Build URL with query params
    let url = `${API_BASE}${path}`;
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle 401 with automatic token refresh
        if (response.status === 401 && !_skipRefresh && this.refreshTokenValue) {
          const newToken = await this.attemptTokenRefresh();
          if (newToken) {
            return this.request<T>(path, { ...options, _skipRefresh: true });
          }
        }

        // Check for 2FA requirement
        const requires2FA = errorData.code === 'REQUIRES_2FA' || errorData.requires2FA;

        throw new ApiError(
          errorData.message || errorData.error || 'Request failed',
          response.status,
          errorData.code,
          requires2FA
        );
      }

      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /** Attempt token refresh with shared promise to prevent concurrent attempts */
  private async attemptTokenRefresh(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<string | null> {
    if (!this.refreshTokenValue) return null;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshTokenValue }),
      });

      if (!response.ok) {
        await this.clearTokens();
        return null;
      }

      const { token, refreshToken } = await response.json();
      await this.setTokens(token, refreshToken || this.refreshTokenValue);
      return token;
    } catch {
      await this.clearTokens();
      return null;
    }
  }

  /** Set both access and refresh tokens */
  async setTokens(token: string | null, refreshToken?: string | null): Promise<void> {
    this.token = token;
    if (refreshToken !== undefined) {
      this.refreshTokenValue = refreshToken;
    }

    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }

    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } else if (refreshToken === null) {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  }

  /** Legacy method for backward compatibility */
  async setToken(token: string | null): Promise<void> {
    await this.setTokens(token);
  }

  /** Clear all tokens */
  async clearTokens(): Promise<void> {
    this.token = null;
    this.refreshTokenValue = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const api = new ApiClient();
