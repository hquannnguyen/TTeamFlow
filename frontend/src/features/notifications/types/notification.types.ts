export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_MENTIONED'
  | 'TASK_COMMENTED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_DUE_DATE_CHANGED'
  | 'PROJECT_INVITED'
  | 'SYSTEM';

export interface NotificationActor {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  email: string;
}

export interface NotificationProject {
  id: string;
  projectKey: string;
  name: string;
}

export interface NotificationTask {
  id: string;
  taskNumber?: number | null;
  title: string;
}

export interface NotificationItemData {
  id: string;
  userId: string;
  actorId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  readAt?: string | null;
  data?: {
    projectId?: string;
    taskId?: string;
    commentId?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  actor?: NotificationActor | null;
  project?: NotificationProject | null;
  task?: NotificationTask | null;
}

export interface NotificationsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}

export interface NotificationsResponse {
  data: NotificationItemData[];
  meta: NotificationsMeta;
}
