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
