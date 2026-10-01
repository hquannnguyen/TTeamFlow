export type ActivityEntityType =
  | 'PROJECT'
  | 'PROJECT_MEMBER'
  | 'TASK'
  | 'KANBAN_COLUMN';

export type ActivityAction =
  // Project actions
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_ARCHIVED'
  | 'PROJECT_RESTORED'
  | 'PROJECT_DELETED'
  // Member actions
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED'
  // Task actions
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_MOVED'
  | 'TASK_COMPLETED'
  | 'TASK_DELETED'
  | 'TASK_ASSIGNED'
  | 'TASK_UNASSIGNED'
  // Column actions
  | 'COLUMN_CREATED'
  | 'COLUMN_UPDATED'
  | 'COLUMN_DELETED'
  | 'COLUMN_REORDERED';

export interface ActivityActor {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface ActivityLogRecord {
  id: string;
  projectId: string;
  actorId: string | null;
  action: ActivityAction | string;
  entityType: ActivityEntityType | string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: ActivityActor | null;
}

export interface ActivityPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface QueryActivityLogsParams {
  page?: number;
  limit?: number;
  action?: ActivityAction | string;
  entityType?: ActivityEntityType | string;
}

export interface GetActivityLogsResponse {
  success: boolean;
  data: ActivityLogRecord[];
  meta: ActivityPaginationMeta;
}
