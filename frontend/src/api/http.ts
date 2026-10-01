import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../features/auth/store/auth.store';

export const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

/** Resolves media URLs (e.g. /uploads/avatars/...) to fully qualified URLs in dev or relative in prod */
export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const backendBase = baseURL.replace(/\/api\/v1\/?$/, '');
  return `${backendBase}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Main axios instance — attaches Bearer token & handles 401 auto-refresh */
export const http = axios.create({
  baseURL,
  withCredentials: true,
});

/**
 * Bare axios instance used ONLY for auth endpoints (/auth/refresh, /auth/login, etc.)
 * This intentionally bypasses the response interceptor to prevent refresh loops.
 */
export const authHttp = axios.create({
  baseURL,
  withCredentials: true,
});

// ── Request interceptor: attach access token ──────────────────────────────────
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Token refresh logic (singleton promise — prevents parallel refresh calls) ─
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = authHttp
      .post<{ success: true; data: { accessToken: string } }>(
        '/auth/refresh',
        {},
      )
      .then((res) => {
        const token = res.data?.data?.accessToken;
        if (!token) return null;
        useAuthStore.getState().setAuth(token, useAuthStore.getState().user);
        return token;
      })
      .catch(() => {
        useAuthStore.getState().logout();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Never retry auth endpoints (prevents infinite loops)
    const isAuthEndpoint = original?.url?.includes('/auth/');

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint
    ) {
      original._retry = true;
      const token = await refreshAccessToken();

      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
    }

    return Promise.reject(error);
  },
);
