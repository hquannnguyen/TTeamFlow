import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProjectMembers,
  updateProjectMemberRole,
  removeProjectMember,
  type ProjectMember,
} from '../api/members.api';
import { getProjects, getProject } from '../../projects/api/projects.api';
import { ProjectSelectDropdown } from '../../projects/components/ProjectSelectDropdown';
import { AddMemberModal } from '../components/AddMemberModal';
import { RemoveMemberModal } from '../components/RemoveMemberModal';
import { useAuthStore } from '../../auth/store/auth.store';
import { useActiveProjectStore } from '../../projects/store/active-project.store';
import { toast } from '../../../components/ui/toast.store';
import { getMediaUrl } from '../../../api/http';

export function ProjectMembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeProjectId, setActiveProjectId } = useActiveProjectStore();
  const currentUser = useAuthStore((s) => s.user);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);

  // 1. Fetch user projects to allow switching projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  // Effective projectId: URL param or activeProjectId or first available project
  const currentProjectId = useMemo(() => {
    if (projectId && projects.some((p) => p.id === projectId)) {
      return projectId;
    }
    if (activeProjectId && projects.some((p) => p.id === activeProjectId)) {
      return activeProjectId;
    }
    return projects.length > 0 ? projects[0].id : '';
  }, [projectId, activeProjectId, projects]);

  // Keep activeProjectId in sync
  useEffect(() => {
    if (currentProjectId && currentProjectId !== activeProjectId) {
      setActiveProjectId(currentProjectId);
    }
  }, [currentProjectId, activeProjectId, setActiveProjectId]);

  // Sync URL if on /members without projectId
  useEffect(() => {
    if (!projectId && currentProjectId) {
      navigate(`/projects/${currentProjectId}/members`, { replace: true });
    }
  }, [projectId, currentProjectId, navigate]);

  // 2. Fetch project details
  const { data: project } = useQuery({
    queryKey: ['project', currentProjectId],
    queryFn: () => getProject(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  // 3. Fetch project members
  const {
    data: members = [],
    isLoading: isLoadingMembers,
    isError,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['project-members', currentProjectId],
    queryFn: () => getProjectMembers(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  const isArchived = project?.status === 'ARCHIVED';

  // Current user's membership & permissions
  const currentMembership = useMemo(() => {
    if (!currentUser || !members) return null;
    return members.find((m) => (m.user?.id || m.userId) === currentUser.id);
  }, [currentUser, members]);

  const isSystemAdmin = currentUser?.systemRole === 'ADMIN';
  const currentUserRole = currentMembership?.role;

  // Can invite: OWNER or MANAGER (or system ADMIN) and project not archived
  const canInvite = useMemo(() => {
    if (isArchived) return false;
    if (isSystemAdmin) return true;
    return currentUserRole === 'OWNER' || currentUserRole === 'MANAGER';
  }, [isArchived, isSystemAdmin, currentUserRole]);

  // Check if current user can edit a member's role
  const canEditRole = (target: ProjectMember) => {
    if (isArchived) return false;
    const targetUserId = target.user?.id || target.userId;
    // Cannot edit own role
    if (targetUserId === currentUser?.id) return false;
    // Cannot edit OWNER role
    if (target.role === 'OWNER') return false;

    if (isSystemAdmin || currentUserRole === 'OWNER') return true;

    // MANAGER can only edit MEMBER or VIEWER, cannot edit other MANAGER
    if (currentUserRole === 'MANAGER') {
      return target.role === 'MEMBER' || target.role === 'VIEWER';
    }

    return false;
  };

  // Check if current user can remove a member
  const canRemove = (target: ProjectMember) => {
    if (isArchived) return false;
    const targetUserId = target.user?.id || target.userId;
    // Cannot remove self
    if (targetUserId === currentUser?.id) return false;
    // Cannot remove OWNER
    if (target.role === 'OWNER') return false;

    if (isSystemAdmin || currentUserRole === 'OWNER') return true;

    // MANAGER can only remove MEMBER or VIEWER
    if (currentUserRole === 'MANAGER') {
      return target.role === 'MEMBER' || target.role === 'VIEWER';
    }

    return false;
  };

  // 4. Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: 'MANAGER' | 'MEMBER' | 'VIEWER';
    }) => updateProjectMemberRole(currentProjectId, userId, { role: newRole }),
    onSuccess: () => {
      toast.success('Đổi vai trò thành viên thành công');
      queryClient.invalidateQueries({ queryKey: ['project-members', currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ['project', currentProjectId] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Không thể cập nhật vai trò thành viên';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  // 5. Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeProjectMember(currentProjectId, userId),
    onSuccess: (data) => {
      const count = data?.unassignedTaskCount ?? 0;
      toast.success(
        count > 0
          ? `Đã xóa thành viên và tự động gỡ gán ${count} nhiệm vụ liên quan.`
          : 'Đã xóa thành viên khỏi dự án thành công.',
      );
      setMemberToRemove(null);
      queryClient.invalidateQueries({ queryKey: ['project-members', currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ['project', currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ['kanban', currentProjectId] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Không thể xóa thành viên';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const name = m.user?.fullName || m.fullName || '';
      const email = m.user?.email || m.email || '';
      const q = searchQuery.trim().toLowerCase();

      if (q && !name.toLowerCase().includes(q) && !email.toLowerCase().includes(q)) {
        return false;
      }

      if (roleFilter !== 'ALL' && m.role !== roleFilter) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, roleFilter]);

  // Role Statistics Summary
  const stats = useMemo(() => {
    const total = members.length;
    let ownerCount = 0;
    let managerCount = 0;
    let memberCount = 0;
    let viewerCount = 0;

    members.forEach((m) => {
      if (m.role === 'OWNER') ownerCount++;
      else if (m.role === 'MANAGER') managerCount++;
      else if (m.role === 'MEMBER') memberCount++;
      else if (m.role === 'VIEWER') viewerCount++;
    });

    return { total, ownerCount, managerCount, memberCount, viewerCount };
  }, [members]);

  // Loading state
  if (isLoadingProjects || (Boolean(currentProjectId) && isLoadingMembers)) {
    return (
      <div className="members-page-container loading-state">
        <div className="spinner-ring" style={{ margin: '60px auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
          Đang tải danh sách thành viên...
        </p>
      </div>
    );
  }

  // No projects available state
  if (!currentProjectId && projects.length === 0) {
    return (
      <div className="members-page-container">
        <div className="members-empty-card">
          <div className="empty-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2>Chưa có dự án nào</h2>
          <p>Bạn cần tạo dự án trước để quản lý thành viên tham gia.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/projects')}
          >
            + Tạo dự án mới
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="members-page-container">
        <div className="members-empty-card">
          <p style={{ color: '#ef4444', fontSize: '15px' }}>
            Không thể tải dữ liệu thành viên dự án hoặc bạn không có quyền truy cập.
          </p>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: '16px' }}
            onClick={() => refetchMembers()}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="members-page-container">
      {/* ── Archived Project Warning Banner ── */}
      {isArchived && (
        <div className="members-archived-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <strong>Dự án đã được lưu trữ (ARCHIVED):</strong> Dự án này đang ở chế độ chỉ đọc. Tất cả các thao tác mời, thay đổi vai trò và xóa thành viên đã bị khóa.
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="members-header-card">
        <div className="members-header-top-row">
          <div className="members-title-group">
            <div className="members-breadcrumbs">
              <span className="breadcrumb-label">DỰ ÁN</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-sub">THÀNH VIÊN</span>
            </div>
            <div className="members-title-row">
              <h1 className="members-main-heading">Quản lý thành viên</h1>
              {projects.length > 0 && (
                <ProjectSelectDropdown
                  projects={projects}
                  currentProjectId={currentProjectId}
                  onSelectProject={(selectedId) => {
                    setActiveProjectId(selectedId);
                    navigate(`/projects/${selectedId}/members`);
                  }}
                  variant="compact"
                />
              )}
            </div>
            <p className="members-sub-heading">
              Theo dõi, mời thành viên mới và phân quyền vai trò tham gia dự án.
            </p>
          </div>

          {/* Action buttons */}
          <div className="members-header-actions">
            <button
              type="button"
              className="btn-invite-primary"
              onClick={() => setIsInviteModalOpen(true)}
              disabled={!canInvite}
              title={
                !canInvite
                  ? isArchived
                    ? 'Dự án đã lưu trữ, không thể mời thêm thành viên'
                    : 'Bạn không có quyền mời thành viên vào dự án này'
                  : 'Mời thành viên mới vào dự án'
              }
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Mời thành viên</span>
            </button>
          </div>
        </div>

        {/* ── Stats Summary Row ── */}
        <div className="members-stats-row">
          <div className="member-stat-card total">
            <span className="stat-label">Tổng thành viên</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="member-stat-card owner">
            <span className="stat-label">Chủ sở hữu</span>
            <span className="stat-value">{stats.ownerCount}</span>
          </div>
          <div className="member-stat-card manager">
            <span className="stat-label">Quản lý</span>
            <span className="stat-value">{stats.managerCount}</span>
          </div>
          <div className="member-stat-card member">
            <span className="stat-label">Thành viên</span>
            <span className="stat-value">{stats.memberCount}</span>
          </div>
          <div className="member-stat-card viewer">
            <span className="stat-label">Người xem</span>
            <span className="stat-value">{stats.viewerCount}</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Controls ── */}
      <div className="members-controls-card">
        <div className="members-search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo tên hoặc email thành viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        <div className="members-filter-group">
          <span className="filter-label">Lọc vai trò:</span>
          <select
            className="filter-role-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Tất cả ({members.length})</option>
            <option value="OWNER">Chủ sở hữu ({stats.ownerCount})</option>
            <option value="MANAGER">Quản lý ({stats.managerCount})</option>
            <option value="MEMBER">Thành viên ({stats.memberCount})</option>
            <option value="VIEWER">Người xem ({stats.viewerCount})</option>
          </select>
        </div>
      </div>

      {/* ── Members Table Section ── */}
      <div className="members-table-container">
        {filteredMembers.length === 0 ? (
          <div className="members-empty-table">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>Không tìm thấy thành viên nào phù hợp với điều kiện tìm kiếm.</p>
            {(searchQuery || roleFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-text-reset"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                }}
              >
                Xóa bộ lọc tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <table className="members-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Thành viên</th>
                <th style={{ width: '25%' }}>Vai trò</th>
                <th style={{ width: '20%' }}>Ngày tham gia</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const userId = member.user?.id || member.userId;
                const displayName = member.user?.fullName || member.fullName || 'Người dùng';
                const displayEmail = member.user?.email || member.email || '';
                const avatar = getMediaUrl(member.user?.avatarUrl || member.avatarUrl);
                const isSelf = userId === currentUser?.id;
                const canEdit = canEditRole(member);
                const canDelete = canRemove(member);

                const joinedDate = member.joinedAt
                  ? new Date(member.joinedAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <tr key={member.id || userId} className={isSelf ? 'row-self' : ''}>
                    {/* User column */}
                    <td>
                      <div className="member-user-cell">
                        <div className="member-avatar-box">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={displayName}
                              className="member-avatar-img"
                            />
                          ) : (
                            <div className="member-avatar-img initials">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="member-user-details">
                          <div className="member-name-row">
                            <span className="member-display-name">{displayName}</span>
                            {isSelf && <span className="member-self-badge">Bạn</span>}
                          </div>
                          <span className="member-display-email">{displayEmail}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role column */}
                    <td>
                      {canEdit ? (
                        <div className="member-role-select-wrap">
                          <select
                            className={`member-role-select role-${member.role.toLowerCase()}`}
                            value={member.role}
                            disabled={updateRoleMutation.isPending}
                            onChange={(e) => {
                              const newRole = e.target.value as 'MANAGER' | 'MEMBER' | 'VIEWER';
                              if (newRole !== member.role) {
                                updateRoleMutation.mutate({
                                  userId,
                                  newRole,
                                });
                              }
                            }}
                          >
                            <option value="MANAGER">Quản lý (MANAGER)</option>
                            <option value="MEMBER">Thành viên (MEMBER)</option>
                            <option value="VIEWER">Người xem (VIEWER)</option>
                          </select>
                        </div>
                      ) : (
                        <span className={`member-role-badge role-${member.role.toLowerCase()}`}>
                          {member.role === 'OWNER'
                            ? 'Chủ sở hữu'
                            : member.role === 'MANAGER'
                            ? 'Quản lý'
                            : member.role === 'MEMBER'
                            ? 'Thành viên'
                            : 'Người xem'}
                        </span>
                      )}
                    </td>

                    {/* Joined date column */}
                    <td>
                      <span className="member-joined-date">{joinedDate}</span>
                    </td>

                    {/* Actions column */}
                    <td style={{ textAlign: 'right' }}>
                      {canDelete ? (
                        <button
                          type="button"
                          className="btn-member-action-delete"
                          onClick={() => setMemberToRemove(member)}
                          title={`Xóa ${displayName} khỏi dự án`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      ) : (
                        <span className="member-action-disabled-placeholder">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add Member Modal ── */}
      <AddMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={currentProjectId}
        projectName={project?.name}
        onMemberAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['project-members', currentProjectId] });
          queryClient.invalidateQueries({ queryKey: ['project', currentProjectId] });
        }}
      />

      {/* ── Remove Member Modal ── */}
      <RemoveMemberModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => {
          if (memberToRemove) {
            const uid = memberToRemove.user?.id || memberToRemove.userId;
            removeMemberMutation.mutate(uid);
          }
        }}
        member={memberToRemove}
        projectName={project?.name}
        isLoading={removeMemberMutation.isPending}
      />
    </div>
  );
}
