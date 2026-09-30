import { http } from '../../../api/http';
import type {
  GetActivityLogsResponse,
  QueryActivityLogsParams,
} from '../types/activity.types';

/**
 * Lấy danh sách lịch sử hoạt động của dự án có phân trang và bộ lọc.
 * Endpoint Backend: GET /api/v1/projects/:projectId/activity-logs
 */
export async function getProjectActivityLogs(
  projectId: string,
  params?: QueryActivityLogsParams,
): Promise<GetActivityLogsResponse> {
  if (!projectId) {
    throw new Error('Project ID không hợp lệ');
  }

  const queryParams: Record<string, string | number> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.action) queryParams.action = params.action;
  if (params?.entityType) queryParams.entityType = params.entityType;

  const response = await http.get<GetActivityLogsResponse>(
    `/projects/${projectId}/activity-logs`,
    { params: queryParams },
  );

  return response.data;
}
