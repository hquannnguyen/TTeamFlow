import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

function MemberAvatarItem({
  user,
  role,
}: {
  user: { id?: string; fullName: string; avatarUrl?: string | null };
  role: string;
}) {
  const [hasError, setHasError] = useState(false);
  const mediaUrl = getMediaUrl(user.avatarUrl);

  return (
    <div
      className="member-avatar-item"
      title={`${user.fullName} (${role})`}
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

  const displayedMembers = project.members.slice(0, 3);
  const extraMembersCount = Math.max(0, project.members.length - 3);

  // Role tag color palette
  const roleStyle =
    currentUserRole === 'OWNER'
      ? { bg: '#FEF3C7', color: '#92400E', label: 'Chủ sở hữu' }
      : currentUserRole === 'MANAGER'
        ? { bg: '#EDE9FE', color: '#5B21B6', label: 'Quản lý' }
        : currentUserRole === 'VIEWER'
          ? { bg: '#F3F4F6', color: '#4B5563', label: 'Chỉ xem' }
          : { bg: '#DBEAFE', color: '#1E40AF', label: 'Thành viên' };

  const progress = project.taskStats?.progress ?? 0;
  const totalTasks = project.taskStats?.total ?? project._count?.tasks ?? 0;
  const completedTasks = project.taskStats?.completed ?? 0;
  const theme = getProjectTheme(project.projectKey || project.id);

  return (
    <div className={`project-card ${isArchived ? 'archived' : ''}`}>
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

      {/* Meta Row: Role Badge & Date Range */}
      <div className="project-meta-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="project-role-badge"
            style={{ background: roleStyle.bg, color: roleStyle.color }}
          >
            {roleStyle.label}
          </span>
          {isArchived && (
            <span className="project-archived-badge">Đã lưu trữ</span>
          )}
        </div>

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

      {/* Card Footer: Members Avatars Stack & Open Board Link */}
      <div className="project-card-footer">
        <div className="member-avatar-stack">
          {displayedMembers.map((m, idx) => (
            <MemberAvatarItem
              key={m.user.id || idx}
              user={m.user}
              role={m.role}
            />
          ))}
          {extraMembersCount > 0 && (
            <div className="member-avatar-item member-avatar-extra" title={`+${extraMembersCount} thành viên khác`}>
              +{extraMembersCount}
            </div>
          )}
        </div>

        <Link to={`/projects/${project.id}/board`} className="btn-open-project">
          <span>Mở dự án</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
