import { DashboardMetrics } from '../types/dashboard.types';

// Dữ liệu giả lập chuẩn theo mẫu thiết kế
const mockDashboardData: DashboardMetrics = {
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

//Gia lap do tre mang 600ms
export async function getDashboardMetrics(projectId: string): Promise<DashboardMetrics> {
  void projectId;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDashboardData);
    }, 600);
  });
}
