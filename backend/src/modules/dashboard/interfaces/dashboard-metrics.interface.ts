export interface StatusDistributionItem {
  columnId: string;
  columnName: string;
  isCompleted: boolean;
  count: number;
}

export interface MemberWorkloadItem {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  activeTaskCount: number;
}

export interface DashboardMetricsResponse {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  progress: number;
  statusDistribution: StatusDistributionItem[];
  memberWorkload: MemberWorkloadItem[];
}
