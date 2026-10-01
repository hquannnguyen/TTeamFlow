import { http } from '../../../api/http';
import type {
  NotificationItemData,
  NotificationsMeta,
  NotificationsResponse,
} from '../types/notification.types';

export interface QueryNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export async function getNotifications(
  params?: QueryNotificationsParams,
): Promise<NotificationsResponse> {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.unreadOnly !== undefined) queryParams.unreadOnly = params.unreadOnly;

  const response = await http.get<{
    success: boolean;
    data: NotificationItemData[];
    meta: NotificationsMeta;
  }>('/notifications', {
    params: queryParams,
  });

  return {
    data: response.data.data ?? [],
    meta: response.data.meta ?? {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      unreadCount: 0,
    },
  };
}

export async function getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  const response = await http.get<{
    success: boolean;
    data: { unreadCount: number };
  }>('/notifications/unread-count');

  // Unwrap response.data.data from backend ResponseInterceptor
  return response.data?.data ?? response.data;
}

export async function markNotificationAsRead(id: string): Promise<NotificationItemData> {
  const response = await http.patch<{
    success: boolean;
    data: NotificationItemData;
  }>(`/notifications/${id}/read`);

  return response.data?.data ?? response.data;
}

export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  updatedCount: number;
}> {
  const response = await http.patch<{
    success: boolean;
    data: { success: boolean; updatedCount: number };
  }>('/notifications/mark-all-read');

  return response.data?.data ?? response.data;
}

export async function deleteNotification(id: string): Promise<{ success: boolean }> {
  const response = await http.delete<{
    success: boolean;
    data: { success: boolean };
  }>(`/notifications/${id}`);

  return response.data?.data ?? response.data;
}
