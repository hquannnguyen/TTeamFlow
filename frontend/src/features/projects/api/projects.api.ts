import { http } from '../../../api/http';

export interface Project {
  id: string;
  projectKey: string;
  name: string;
  description?: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  members: Array<{ role: 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER' }>;
}

export async function getProjects() {
  const response = await http.get<{ success: true; data: Project[] }>('/projects');
  return response.data.data;
}
