import { http } from '../../../api/http';

export interface KanbanTaskAssignment {
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    email?: string;
  };
}

export interface KanbanTask {
  id: string;
  projectId: string;
  columnId: string;
  taskNumber?: number | null;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  position: number;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  assignments?: KanbanTaskAssignment[];
  _count?: {
    checklistItems: number;
    comments: number;
  };
}

export interface KanbanColumn {
  id: string;
  projectId: string;
  name: string;
  position: number;
  isCompleted: boolean;
  tasks: KanbanTask[];
}

export interface CreateTaskInput {
  columnId: string;
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string;
  dueDate?: string;
  assigneeIds?: string[];
}

export async function getBoard(projectId: string) {
  const response = await http.get<{ success: true; data: KanbanColumn[] }>(
    `/projects/${projectId}/kanban`,
  );
  return response.data.data;
}

export async function moveTask(
  taskId: string,
  targetColumnId: string,
  newPosition: number,
) {
  const response = await http.patch<{ success: true; data: KanbanTask }>(
    `/tasks/${taskId}/move`,
    { targetColumnId, newPosition },
  );
  return response.data.data;
}

export async function createTask(projectId: string, dto: CreateTaskInput) {
  const response = await http.post<{ success: true; data: KanbanTask }>(
    `/projects/${projectId}/tasks`,
    dto,
  );
  return response.data.data;
}

export async function deleteTask(taskId: string) {
  const response = await http.delete<{ success: true; data: KanbanTask }>(
    `/tasks/${taskId}`,
  );
  return response.data.data;
}

export async function createColumn(projectId: string, name: string) {
  const response = await http.post<{ success: true; data: KanbanColumn }>(
    `/projects/${projectId}/columns`,
    { name },
  );
  return response.data.data;
}

export async function updateColumn(
  projectId: string,
  columnId: string,
  dto: { name?: string; isCompleted?: boolean },
) {
  const response = await http.patch<{ success: true; data: KanbanColumn }>(
    `/projects/${projectId}/columns/${columnId}`,
    dto,
  );
  return response.data.data;
}

export async function deleteColumn(
  projectId: string,
  columnId: string,
  targetColumnId?: string,
) {
  const url = targetColumnId
    ? `/projects/${projectId}/columns/${columnId}?targetColumnId=${targetColumnId}`
    : `/projects/${projectId}/columns/${columnId}`;
  const response = await http.delete<{ success: true; data: { message: string } }>(url);
  return response.data.data;
}

export async function reorderColumns(
  projectId: string,
  columns: Array<{ id: string; position: number }>,
) {
  const response = await http.patch<{ success: true; data: KanbanColumn[] }>(
    `/projects/${projectId}/columns/reorder`,
    { columns: columns.map((c) => ({ columnId: c.id, position: c.position })) },
  );
  return response.data.data;
}

export interface CommentItem {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  content: string;
  isCompleted: boolean;
  isDone?: boolean;
  position: number;
}

export interface ActivityLogItem {
  id: string;
  projectId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string | null;
  dueDate?: string | null;
  assigneeIds?: string[];
}

export async function getTaskDetail(taskId: string) {
  const response = await http.get<{ success: true; data: KanbanTask }>(
    `/tasks/${taskId}`,
  );
  return response.data.data;
}

export async function updateTask(taskId: string, dto: UpdateTaskInput) {
  const response = await http.patch<{ success: true; data: KanbanTask }>(
    `/tasks/${taskId}`,
    dto,
  );
  return response.data.data;
}

export async function getComments(taskId: string) {
  const response = await http.get<{ success: true; data: CommentItem[] }>(
    `/tasks/${taskId}/comments`,
  );
  return response.data.data;
}

export async function createComment(taskId: string, content: string) {
  const response = await http.post<{ success: true; data: CommentItem }>(
    `/tasks/${taskId}/comments`,
    { content },
  );
  return response.data.data;
}

export async function deleteComment(commentId: string) {
  const response = await http.delete<{ success: true; data: CommentItem }>(
    `/comments/${commentId}`,
  );
  return response.data.data;
}

export async function getChecklists(taskId: string) {
  const response = await http.get<{ success: true; data: ChecklistItem[] }>(
    `/tasks/${taskId}/checklists`,
  );
  return response.data.data;
}

export async function createChecklistItem(taskId: string, content: string) {
  const response = await http.post<{ success: true; data: ChecklistItem }>(
    `/tasks/${taskId}/checklists`,
    { content },
  );
  return response.data.data;
}

export async function updateChecklistItem(
  id: string,
  dto: { isCompleted?: boolean; isDone?: boolean; content?: string },
) {
  const isCompletedVal =
    dto.isCompleted !== undefined ? dto.isCompleted : dto.isDone;
  const payload: { isCompleted?: boolean; content?: string } = {};
  if (isCompletedVal !== undefined) payload.isCompleted = isCompletedVal;
  if (dto.content !== undefined) payload.content = dto.content;

  const response = await http.patch<{ success: true; data: ChecklistItem }>(
    `/checklists/${id}`,
    payload,
  );
  return response.data.data;
}

export async function deleteChecklistItem(id: string) {
  const response = await http.delete<{ success: true; data: ChecklistItem }>(
    `/checklists/${id}`,
  );
  return response.data.data;
}

export async function getActivityLogs(projectId: string) {
  const response = await http.get<{ success: true; data: ActivityLogItem[] }>(
    `/projects/${projectId}/activity-logs`,
  );
  return response.data.data;
}


