import { http } from '../../../api/http';
import { AdminUser, GetAdminUsersResponse, PaginationMeta, QueryUsersParams } from '../types/admin.types';

export async function getAdminUsers(params: QueryUsersParams = {}): Promise<GetAdminUsersResponse> {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.page !== undefined) queryParams.page = params.page;
  if (params.limit !== undefined) queryParams.limit = params.limit;
  if (params.search && params.search.trim()) queryParams.search = params.search.trim();
  if (params.isActive !== undefined) queryParams.isActive = params.isActive;
  if (params.sortBy) queryParams.sortBy = params.sortBy;
  if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

  const res = await http.get<{
    success: true;
    data: AdminUser[];
    meta: PaginationMeta;
  }>('/admin/users', { params: queryParams });

  return {
    data: res.data.data,
    meta: res.data.meta,
  };
}

export async function updateUserStatus(userId: string, isActive: boolean): Promise<AdminUser> {
  const res = await http.patch<{ success: true; data: AdminUser }>(`/admin/users/${userId}/status`, {
    isActive,
  });
  return res.data.data;
}

