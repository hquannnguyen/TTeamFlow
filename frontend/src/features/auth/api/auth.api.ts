import { http } from '../../../api/http';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    systemRole: 'ADMIN' | 'USER';
  };
}

export async function login(payload: LoginPayload) {
  const response = await http.post<{ success: true; data: LoginResponse }>(
    '/auth/login',
    payload,
  );
  return response.data.data;
}
