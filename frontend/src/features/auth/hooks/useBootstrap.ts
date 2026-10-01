import { useEffect } from 'react';
import { getMe } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { authHttp } from '../../../api/http';

/**
 * Called once at app startup.
 * If the browser has a valid HttpOnly refresh token cookie, silently restores
 * the session by:
 *   1. Calling /auth/refresh to get a new access token
 *   2. Calling /auth/me to load user profile
 *   3. Storing both in the auth store
 *
 * Always sets isBootstrapping = false when done (success or failure).
 */
export function useBootstrap() {
  const { setAuth, setBootstrapping, logout } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Try to silently refresh — uses the HttpOnly cookie
        const refreshRes = await authHttp.post<{
          success: true;
          data: { accessToken: string };
        }>('/auth/refresh', {});

        const accessToken = refreshRes.data?.data?.accessToken;
        if (!accessToken || cancelled) return;

        // Temporarily set token so getMe() can attach the Bearer header
        useAuthStore.getState().setAuth(accessToken, null);

        try {
          const user = await getMe();
          if (!cancelled) {
            setAuth(accessToken, user);
          }
        } catch {
          // getMe() failed after a valid refresh (e.g. network hiccup)
          // Clear the partial token-without-user state to prevent null crashes
          if (!cancelled) logout();
        }
      } catch {
        // No valid cookie or refresh failed — user needs to log in manually
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
