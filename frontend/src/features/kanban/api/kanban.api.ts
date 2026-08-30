import { http } from '../../../api/http';

export interface KanbanTask {
  id: string;
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  position: number;
}

export interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  isCompleted: boolean;
  tasks: KanbanTask[];
}

export async function getBoard(projectId: string) {
  const response = await http.get<{ success: true; data: KanbanColumn[] }>(
    `/projects/${projectId}/kanban`,
  );
  return response.data.data;
}
