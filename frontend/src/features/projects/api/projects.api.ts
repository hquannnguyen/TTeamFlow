import { http } from '../../../api/http';

export type ProjectRole = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export interface ProjectMemberInfo {
  role: ProjectRole;
  user: {
    id: string;
    fullName: string;
    email?: string;
    avatarUrl?: string | null;
  };
}

export interface ProjectTaskStats {
  total: number;
  completed: number;
  progress: number;
}

export interface Project {
  id: string;
  projectKey: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    fullName: string;
    email?: string;
    avatarUrl?: string | null;
  };
  members: ProjectMemberInfo[];
  _count?: { tasks: number };
  taskStats?: ProjectTaskStats;
}

export interface CreateProjectInput {
  name: string;
  projectKey: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}

export async function getProjects(
  status?: ProjectStatus | unknown,
  scope?: 'all' | 'my',
  ownerId?: string,
) {
  const isStatus = typeof status === 'string' && (status === 'ACTIVE' || status === 'ARCHIVED');
  const params: Record<string, string> = {};
  if (isStatus) params.status = status;
  if (scope) params.scope = scope;
  if (ownerId) params.ownerId = ownerId;
  const response = await http.get<{ success: true; data: Project[] }>('/projects', { params });
  return response.data.data;
}

export async function getProject(projectId: string) {
  const response = await http.get<{ success: true; data: Project }>(`/projects/${projectId}`);
  return response.data.data;
}

export async function createProject(dto: CreateProjectInput) {
  const response = await http.post<{ success: true; data: Project }>('/projects', dto);
  return response.data.data;
}

export async function updateProject(projectId: string, dto: UpdateProjectInput) {
  const response = await http.patch<{ success: true; data: Project }>(`/projects/${projectId}`, dto);
  return response.data.data;
}

export async function archiveProject(projectId: string) {
  const response = await http.patch<{ success: true; data: Project }>(`/projects/${projectId}/archive`);
  return response.data.data;
}

export async function restoreProject(projectId: string) {
  const response = await http.patch<{ success: true; data: Project }>(`/projects/${projectId}/restore`);
  return response.data.data;
}

export async function deleteProject(projectId: string) {
  const response = await http.delete<{ success: true; data: Project }>(`/projects/${projectId}`);
  return response.data.data;
}
