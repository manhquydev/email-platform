import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getFriendlyErrorMessage } from './errorMapping';
import { handleCriticalError } from '../hooks/useApiError';
import { tokenManager } from './token-manager';

export const API_BASE = (window.env?.API_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
export const PAGE_SIZE = { domains: 20, inboxes: 20, messages: 20 };

export * from './format';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();

    if (token) {
      if (tokenManager.isTokenExpiringSoon(token)) {
        try {
          const newToken = await tokenManager.refreshAccessToken();
          config.headers.Authorization = `Bearer ${newToken}`;
        } catch (error) {
          console.error('Proactive refresh failed:', (error as Error).message);
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await tokenManager.refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  skipErrorRedirect?: boolean;
};

function parseErrorPayload(data: unknown): string {
  const payload = (data as { error?: string; message?: string; details?: string }) ?? {};
  const rawMsg = payload.message ?? payload.error ?? 'Request failed';
  const msg = getFriendlyErrorMessage(rawMsg);
  const details = payload.details;
  return details ? `${msg}: ${details}` : msg;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  try {
    const headers: Record<string, string> = { ...opts.headers };

    if (opts.token) {
      headers.Authorization = `Bearer ${opts.token}`;
    }

    const response = await axiosInstance.request({
      url: path,
      method: opts.method || 'GET',
      data: opts.body,
      headers,
    });

    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorMessage = parseErrorPayload(error.response?.data);

      if (!opts.skipErrorRedirect) {
        handleCriticalError(status, path);
      }

      throw new ApiError(errorMessage, status);
    }

    throw error;
  }
}
