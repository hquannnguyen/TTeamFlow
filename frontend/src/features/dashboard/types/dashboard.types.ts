export interface StatusDistributionItem {
  columnId: string;
  columnName: string;
  isCompleted: boolean;
  count: number;
  percentage?: number;
  color?: string;
}

export interface MemberWorkloadItem {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  activeTaskCount: number;
  totalTaskCount?: number;
  completedCount?: number;
  inProgressCount?: number;
  todoCount?: number;
  isOverloaded?: boolean;
}

export interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  progress: number;
  targetProgress?: number;
  activeTasks?: number;
  growthRate?: number;
  statusDistribution: StatusDistributionItem[];
  memberWorkload: MemberWorkloadItem[];
}