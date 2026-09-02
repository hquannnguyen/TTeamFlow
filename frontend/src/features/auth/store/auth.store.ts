import { create } from 'zustand';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  systemRole: 'ADMIN' | 'USER';
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** true while the app is silently checking /auth/me on first load */
  isBootstrapping: boolean;

  setAuth: (token: string, user: AuthUser | null) => void;
  setBootstrapping: (v: boolean) => void;
  logout: () => void;

  // Legacy compat (keep until all callers migrated)
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isBootstrapping: true,

  setAuth: (accessToken, user) => set({ accessToken, user }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  logout: () => set({ accessToken: null, user: null }),

  // Legacy shim
  setAccessToken: (token) => set({ accessToken: token }),
}));

// Convenience selector
export const selectIsAdmin = (s: AuthState) => s.user?.systemRole === 'ADMIN';
