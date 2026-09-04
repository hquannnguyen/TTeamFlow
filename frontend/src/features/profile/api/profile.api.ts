import { http } from '../../../api/http';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  systemRole: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

/** GET /users/me — full profile (includes phone, avatarUrl, createdAt) */
export async function getProfile(): Promise<UserProfile> {
  const res = await http.get<{ success: true; data: UserProfile }>('/users/me');
  return res.data.data;
}

/** PATCH /users/me — update fullName and/or phone */
export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const res = await http.patch<{ success: true; data: UserProfile }>('/users/me', payload);
  return res.data.data;
}

/** PATCH /users/me/avatar — multipart upload */
export async function updateAvatar(file: File): Promise<UserProfile> {
  const form = new FormData();
  form.append('avatar', file);
  const res = await http.patch<{ success: true; data: UserProfile }>(
    '/users/me/avatar',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

/** PATCH /auth/change-password */
export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const res = await http.patch<{ success: true; data: { message: string } }>(
    '/auth/change-password',
    payload,
  );
  return res.data.data;
}
