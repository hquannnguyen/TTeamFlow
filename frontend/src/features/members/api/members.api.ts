import { http } from '../../../api/http';
import type { ProjectRole } from '../../projects/api/projects.api';

export interface CandidateUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  isMember?: boolean;
  isSelf?: boolean;
}

export interface ProjectMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: ProjectRole;
  joinedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface AddProjectMemberInput {
  email: string;
  role: 'MANAGER' | 'MEMBER' | 'VIEWER';
}

export interface UpdateProjectMemberRoleInput {
  role: 'MANAGER' | 'MEMBER' | 'VIEWER';
}

/**
 * Tìm kiếm người dùng trong hệ thống theo email hoặc tên (hỗ trợ gợi ý mời vào dự án)
 */
export async function searchCandidateUsers(
  query: string,
  projectId?: string,
): Promise<CandidateUser[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params: Record<string, string> = { q: trimmed };
  if (projectId) params.projectId = projectId;

  const response = await http.get<{ success: boolean; data: CandidateUser[] }>(
    '/users/search',
    { params },
  );
  return response.data.data;
}

/**
 * Lấy danh sách thành viên của một dự án
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await http.get<{ success: boolean; data: ProjectMember[] }>(
    `/projects/${projectId}/members`,
  );
  return response.data.data;
}

/**
 * Thêm thành viên vào dự án
 */
export async function addProjectMember(
  projectId: string,
  dto: AddProjectMemberInput,
): Promise<ProjectMember> {
  const response = await http.post<{ success: boolean; data: ProjectMember }>(
    `/projects/${projectId}/members`,
    dto,
  );
  return response.data.data;
}

/**
 * Cập nhật vai trò thành viên trong dự án
 */
export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  dto: UpdateProjectMemberRoleInput,
): Promise<ProjectMember> {
  const response = await http.patch<{ success: boolean; data: ProjectMember }>(
    `/projects/${projectId}/members/${userId}`,
    dto,
  );
  return response.data.data;
}

/**
 * Xóa thành viên khỏi dự án
 */
export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<{ success: boolean; removedUserId: string; unassignedTaskCount: number }> {
  const response = await http.delete<{
    success: boolean;
    data: { success: boolean; removedUserId: string; unassignedTaskCount: number };
  }>(`/projects/${projectId}/members/${userId}`);
  return response.data.data;
}
