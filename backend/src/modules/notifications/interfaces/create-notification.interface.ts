import { NotificationType } from "@prisma/client";

export interface CreateNotificationPayload {
  userId: string;
  actorId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown> | null;
}
