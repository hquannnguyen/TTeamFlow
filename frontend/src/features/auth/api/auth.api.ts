import { authHttp, http } from '../../../api/http';
import type { AuthUser } from '../store/auth.store';

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

// ── API functions ─────────────────────────────────────────────────────────────

/** POST /auth/login — returns accessToken + user (no passwordHash) */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await authHttp.post<{ success: true; data: AuthResponse }>(
    '/auth/login',
    payload,
  );
  return res.data.data;
}

/** POST /auth/register — returns 201 with the created user */
export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const res = await authHttp.post<{
    success: true;
    data: AuthUser & { createdAt?: string };
  }>('/auth/register', payload);

  // Backend returns createdAt too; we pick only the AuthUser fields
  const { id, fullName, email, systemRole } = res.data.data;
  return { id, fullName, email, systemRole };
}

/** GET /auth/me — returns current user from access token */
export async function getMe(): Promise<AuthUser> {
  const res = await http.get<{ success: true; data: AuthUser }>('/auth/me');
  return res.data.data;
}

/** POST /auth/logout — revokes refresh token server-side */
export async function logout(): Promise<void> {
  await authHttp.post('/auth/logout');
}
