import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Project, ProjectRole } from '../api/projects.api';
import { getProjectTheme } from '../utils/project-theme.util';
import { getMediaUrl } from '../../../api/http';

interface ProjectCardProps {
  project: Project;
  currentUserRole?: ProjectRole;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onRestore: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getRoleBadgeStyle(role: string) {
  switch (role) {
    case 'OWNER':
      return { bg: '#FEF3C7', color: '#92400E', label: 'Chủ sở hữu' };
    case 'MANAGER':
      return { bg: '#EDE9FE', color: '#5B21B6', label: 'Quản lý' };
    case 'VIEWER':
      return { bg: '#F3F4F6', color: '#4B5563', label: 'Chỉ xem' };
    case 'MEMBER':
    default:
      return { bg: '#DBEAFE', color: '#1E40AF', label: 'Thành viên' };
  }
}

function MemberAvatarItem({
  user,
  role,
}: {
  user: { id?: string; fullName: string; avatarUrl?: string | null };
  role: string;
}) {
  const [hasError, setHasError] = useState(false);
  const mediaUrl = getMediaUrl(user.avatarUrl);
  const roleLabel = getRoleBadgeStyle(role).label;

  return (
    <div
      className="member-avatar-item"
      title={`${user.fullName} (${roleLabel})`}
    >
      {mediaUrl && !hasError ? (
        <img
          src={mediaUrl}
          alt={user.fullName}
          className="member-avatar-img"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="member-avatar-fallback">
          {getInitials(user.fullName)}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Vừa cập nhật';
  if (diffHours < 24) return `Cập nhật ${diffHours} giờ trước`;
  if (diffDays === 1) return 'Cập nhật hôm qua';
  if (diffDays < 30) return `Cập nhật ${diffDays} ngày trước`;
  return `Cập nhật ${date.toLocaleDateString('vi-VN')}`;
}

export function ProjectCard({
  project,
  currentUserRole,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'MANAGER';
  const isOwner = currentUserRole === 'OWNER';
  const isArchived = project.status === 'ARCHIVED';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Do not trigger card navigation if clicking on interactive controls
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.project-menu-wrap') ||
      target.closest('.project-dropdown-menu') ||
      target.closest('.member-avatar-extra')
    ) {
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      window.open(`/projects/${project.id}/board`, '_blank');
      return;
    }
    navigate(`/projects/${project.id}/board`);
  };

  const members = project.members || [];
  const displayedMembers = members.slice(0, 4);
  const extraMembers = members.slice(4);
  const extraMembersCount = extraMembers.length;

  const progress = project.taskStats?.progress ?? 0;
  const totalTasks = project.taskStats?.total ?? project._count?.tasks ?? 0;
  const completedTasks = project.taskStats?.completed ?? 0;
  const theme = getProjectTheme(project.projectKey || project.id);

  return (
    <div
      className={`project-card ${isArchived ? 'archived' : ''}`}
      onClick={handleCardClick}
    >
      {/* Top Accent Color Bar */}
      <div
        className={`project-card-accent-bar ${isArchived ? 'archived' : ''}`}
        style={!isArchived ? { background: theme.accentGradient } : undefined}
      />

      {/* Card Header */}
      <div className="project-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div
            className="project-key-badge"
            title={`Mã dự án: ${project.projectKey}`}
            style={
              !isArchived
                ? {
                    background: theme.badgeBg,
                    color: theme.badgeColor,
                    boxShadow: `0 2px 8px ${theme.badgeBg}40`,
                  }
                : undefined
            }
          >
            {project.projectKey}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Link
              to={`/projects/${project.id}/board`}
              className="project-title-link"
              title={project.name}
            >
              {project.name}
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="project-updated-text">
                {formatRelativeTime(project.updatedAt)}
              </span>
              {project.createdBy && (
                <>
                  <span style={{ fontSize: 11, color: 'var(--gray-300)' }}>•</span>
                  <span
                    className="project-updated-text"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title={`Người tạo: ${project.createdBy.fullName}`}
                  >
                    {getMediaUrl(project.createdBy.avatarUrl) ? (
                      <img
                        src={getMediaUrl(project.createdBy.avatarUrl)!}
                        alt={project.createdBy.fullName}
                        style={{ width: 15, height: 15, borderRadius: '50%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    Tạo bởi {project.createdBy.fullName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Menu button (only if has management rights or can view details) */}
        {canManage && (
          <div className="project-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="project-menu-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Tùy chọn dự án"
              aria-expanded={menuOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
              </svg>
            </button>

            {menuOpen && (
              <div className="project-dropdown-menu">
                <button
                  type="button"
                  className="project-dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(project);
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                  </svg>
                  <span>Chỉnh sửa</span>
                </button>

                {isArchived ? (
                  <button
                    type="button"
                    className="project-dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onRestore(project);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                    </svg>
                    <span>Khôi phục dự án</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="project-dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onArchive(project);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" />
                    </svg>
                    <span>Lưu trữ</span>
                  </button>
                )}

                {isOwner && (
                  <>
                    <div className="project-dropdown-divider" />
                    <button
                      type="button"
                      className="project-dropdown-item text-danger"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(project);
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      <span>Xóa vĩnh viễn</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="project-description">
        {project.description || 'Chưa có mô tả cho dự án này.'}
      </p>

      {/* Progress Bar Section (from Stitch Design) */}
      <div className="project-progress-wrap">
        <div className="project-progress-label-row">
          <span className="project-progress-title">
            {totalTasks > 0 ? (
              <>Tiến độ <span className="project-progress-count">({completedTasks}/{totalTasks})</span></>
            ) : (
              <>Tiến độ</>
            )}
          </span>
          <span
            className={`project-progress-percentage ${progress === 100 ? 'completed' : ''}`}
            style={progress < 100 && !isArchived ? { color: theme.textAccent } : undefined}
          >
            {progress}%
          </span>
        </div>
        <div className="project-progress-track">
          <div
            className={`project-progress-fill ${progress === 100 ? 'completed' : isArchived ? 'archived' : ''}`}
            style={{
              width: `${progress}%`,
              background:
                progress === 100
                  ? undefined
                  : isArchived
                    ? undefined
                    : theme.progressGradient,
            }}
          />
        </div>
      </div>

      {/* Meta Row: Members & Date Range */}
      <div className="project-meta-row">
        <div className="project-members-meta">
          <span className="project-members-badge">Thành viên</span>
          {displayedMembers.length > 0 ? (
            <div className="member-avatar-stack">
              {displayedMembers.map((m, idx) => (
                <MemberAvatarItem
                  key={m.user?.id || idx}
                  user={m.user}
                  role={m.role}
                />
              ))}
              {extraMembersCount > 0 && (
                <div
                  className="member-avatar-item member-avatar-extra"
                  onClick={(e) => e.stopPropagation()}
                >
                  +{extraMembersCount}
                  <div className="extra-members-tooltip" role="tooltip">
                    <div className="extra-members-tooltip-header">
                      +{extraMembersCount} thành viên khác
                    </div>
                    <div className="extra-members-tooltip-list">
                      {extraMembers.map((m, idx) => {
                        const roleInfo = getRoleBadgeStyle(m.role);
                        const mediaUrl = getMediaUrl(m.user?.avatarUrl);
                        return (
                          <div key={m.user?.id || idx} className="extra-member-row">
                            <div className="extra-member-avatar">
                              {mediaUrl ? (
                                <img
                                  src={mediaUrl}
                                  alt={m.user?.fullName}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span>{getInitials(m.user?.fullName)}</span>
                              )}
                            </div>
                            <span className="extra-member-name" title={m.user?.fullName}>
                              {m.user?.fullName}
                            </span>
                            <span
                              className="extra-member-role-badge"
                              style={{ background: roleInfo.bg, color: roleInfo.color }}
                            >
                              {roleInfo.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Chưa có</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isArchived && (
            <span className="project-archived-badge">Đã lưu trữ</span>
          )}
          {(project.startDate || project.dueDate) && (
            <div className="project-date-range">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>
                {project.dueDate
                  ? `Hạn: ${new Date(project.dueDate).toLocaleDateString('vi-VN')}`
                  : `Bắt đầu: ${new Date(project.startDate!).toLocaleDateString('vi-VN')}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Large Open Board Button */}
      <div className="project-card-footer">
        <Link to={`/projects/${project.id}/board`} className="btn-open-project">
          <span>Mở dự án</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
