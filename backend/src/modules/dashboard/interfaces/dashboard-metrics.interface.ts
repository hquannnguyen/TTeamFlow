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
  /** Nhiệm vụ chưa hoàn thành đang gán cho thành viên */
  activeTaskCount: number;
  /** Tổng nhiệm vụ được gán (kể cả đã hoàn thành) */
  totalTaskCount: number;
  completedCount: number;
  /** Ở cột đang xử lý (không phải TODO, không phải cột hoàn thành) */
  inProgressCount: number;
  todoCount: number;
  /** activeTaskCount >= WORKLOAD_OVERLOAD_THRESHOLD */
  isOverloaded: boolean;
}

export interface DashboardMetricsResponse {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  /** Nhiệm vụ đang xử lý: ở cột không phải TODO và không phải cột hoàn thành */
  activeTasks: number;
  progress: number;
  statusDistribution: StatusDistributionItem[];
  memberWorkload: MemberWorkloadItem[];
}
