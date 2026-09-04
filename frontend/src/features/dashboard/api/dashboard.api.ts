import { http } from '../../../api/http';
import { DashboardMetrics } from '../types/dashboard.types';

// Dữ liệu giả lập chuẩn làm fallback cho những phần Backend chưa xây hoặc khi xem demo
export const mockDashboardData: DashboardMetrics = {
  totalTasks: 240,
  completedTasks: 120,
  overdueTasks: 3,
  progress: 68,
  targetProgress: 80,
  activeTasks: 45,
  growthRate: 12,
  statusDistribution: [
    { columnId: 'col-1', columnName: 'Cần làm', isCompleted: false, count: 72, percentage: 30, color: '#94a3b8' },
    { columnId: 'col-2', columnName: 'Đang làm', isCompleted: false, count: 48, percentage: 20, color: '#d97706' },
    { columnId: 'col-3', columnName: 'Hoàn thành', isCompleted: true, count: 120, percentage: 50, color: '#10b981' },
  ],
  memberWorkload: [
    {
      userId: 'u-1',
      fullName: 'Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces',
      activeTaskCount: 8,
      totalTaskCount: 18,
      completedCount: 10,
      inProgressCount: 5,
      todoCount: 3,
      isOverloaded: false,
    },
    {
      userId: 'u-2',
      fullName: 'Marcus Johnson',
      avatarUrl: null,
      activeTaskCount: 16,
      totalTaskCount: 24,
      completedCount: 8,
      inProgressCount: 12,
      todoCount: 4,
      isOverloaded: true,
    },
    {
      userId: 'u-3',
      fullName: 'David Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
      activeTaskCount: 4,
      totalTaskCount: 12,
      completedCount: 8,
      inProgressCount: 2,
      todoCount: 2,
      isOverloaded: false,
    },
    {
      userId: 'u-4',
      fullName: 'Elena Rodriguez',
      avatarUrl: null,
      activeTaskCount: 5,
      totalTaskCount: 9,
      completedCount: 4,
      inProgressCount: 3,
      todoCount: 2,
      isOverloaded: false,
    },
  ],
};

const PALETTE = ['#94a3b8', '#d97706', '#10b981', '#6366f1', '#ec4899', '#06b6d4'];

/**
 * Lấy số liệu Dashboard:
 * - Gọi API Backend thật: GET /api/v1/projects/:projectId/dashboard
 * - Điền giá trị fallback/tính toán bổ trợ cho các trường UI nâng cao mà Backend chưa xây
 */
export async function getDashboardMetrics(projectId: string): Promise<DashboardMetrics> {
  if (!projectId || projectId === 'default') {
    return mockDashboardData;
  }

  try {
    const res = await http.get<{ success: true; data: DashboardMetrics }>(
      `/projects/${projectId}/dashboard`,
    );
    const data = res.data.data;

    const total = data.totalTasks ?? 0;
    const completed = data.completedTasks ?? 0;
    const active = Math.max(0, total - completed);

    return {
      ...data,
      targetProgress: data.targetProgress ?? 80,
      growthRate: data.growthRate ?? (total > 0 ? 12 : 0),
      activeTasks: data.activeTasks ?? active,
      statusDistribution: (data.statusDistribution || []).map((col, idx) => ({
        ...col,
        percentage:
          total > 0 ? Math.round((col.count / total) * 100) : 0,
        color:
          col.color ||
          (col.isCompleted
            ? '#10b981'
            : col.columnName.toLowerCase().includes('đang') ||
              col.columnName.toLowerCase().includes('progress')
            ? '#d97706'
            : PALETTE[idx % PALETTE.length]),
      })),
      memberWorkload: (data.memberWorkload || []).map((m) => {
        const count = m.activeTaskCount ?? 0;
        return {
          ...m,
          totalTaskCount: m.totalTaskCount ?? Math.max(count, 1),
          completedCount: m.completedCount ?? 0,
          inProgressCount: m.inProgressCount ?? count,
          todoCount: m.todoCount ?? 0,
          isOverloaded: m.isOverloaded ?? count >= 10,
        };
      }),
    };
  } catch (error) {
    console.warn('Backend dashboard call failed, fallback to mock data:', error);
    return mockDashboardData;
  }
}
