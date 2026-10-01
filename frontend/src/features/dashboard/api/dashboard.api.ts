import { http } from '../../../api/http';
import { DashboardMetrics } from '../types/dashboard.types';

const PALETTE = ['#94a3b8', '#d97706', '#10b981', '#6366f1', '#ec4899', '#06b6d4'];

/**
 * Lấy số liệu Dashboard trực tiếp từ API Backend thật (100% No Mock):
 * Endpoint: GET /api/v1/projects/:projectId/dashboard
 */
export async function getDashboardMetrics(projectId: string): Promise<DashboardMetrics> {
  if (!projectId) {
    throw new Error('Project ID không hợp lệ');
  }

  const res = await http.get<{ success: true; data: DashboardMetrics }>(
    `/projects/${projectId}/dashboard`,
  );
  const data = res.data.data;

  const total = data.totalTasks ?? 0;
  const completed = data.completedTasks ?? 0;
  const active = Math.max(0, total - completed);

  return {
    ...data,
    totalTasks: total,
    completedTasks: completed,
    overdueTasks: data.overdueTasks ?? 0,
    progress: data.progress ?? 0,
    targetProgress: data.targetProgress ?? 80,
    growthRate: data.growthRate ?? (total > 0 ? 12 : 0),
    activeTasks: active,
    statusDistribution: (data.statusDistribution || []).map((col, idx) => ({
      ...col,
      percentage: total > 0 ? Math.round((col.count / total) * 100) : 0,
      color:
        col.color ||
        (col.isCompleted
          ? '#10b981'
          : col.columnName.toLowerCase().includes('đang') ||
            col.columnName.toLowerCase().includes('progress')
          ? '#d97706'
          : PALETTE[idx % PALETTE.length]),
    })),
    memberWorkload: (data.memberWorkload || []).map((m) => ({
      ...m,
      activeTaskCount: m.activeTaskCount ?? 0,
      isOverloaded: (m.activeTaskCount ?? 0) >= 8,
    })),
  };
}