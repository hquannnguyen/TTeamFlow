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

// ── Quên / đặt lại mật khẩu & xác minh email ─────────────────────────────────

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await authHttp.post<{ success: true; data: { message: string } }>(
    '/auth/forgot-password',
    { email },
  );
  return res.data.data;
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await authHttp.post<{ success: true; data: { message: string } }>(
    '/auth/reset-password',
    { token, newPassword },
  );
  return res.data.data;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const res = await authHttp.post<{ success: true; data: { message: string } }>(
    '/auth/verify-email',
    { token },
  );
  return res.data.data;
}

export async function resendVerification(): Promise<{ message: string }> {
  const res = await http.post<{ success: true; data: { message: string } }>(
    '/auth/resend-verification',
  );
  return res.data.data;
}
