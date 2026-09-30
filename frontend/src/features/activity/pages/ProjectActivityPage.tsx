import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjects, getProject } from '../../projects/api/projects.api';
import { getBoard } from '../../kanban/api/kanban.api';
import { ProjectSelectDropdown } from '../../projects/components/ProjectSelectDropdown';
import { useActiveProjectStore } from '../../projects/store/active-project.store';
import { getProjectActivityLogs } from '../api/activity.api';
import type {
  ActivityAction,
  ActivityEntityType,
  ActivityLogRecord,
} from '../types/activity.types';
import {
  ENTITY_TYPE_OPTIONS,
  ACTION_FILTER_OPTIONS,
  formatActivityLog,
  formatRelativeTime,
  formatExactDateTime,
  formatDateGroupHeader,
  type ActivityFormatterContext,
  type FormattedActivityInfo,
} from '../utils/activity-formatter';
import { getMediaUrl } from '../../../api/http';

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function renderEntityIcon(iconType: FormattedActivityInfo['iconType']) {
  switch (iconType) {
    case 'project':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        </svg>
      );
    case 'member':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'column':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
        </svg>
      );
    case 'comment':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'document':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case 'task':
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
  }
}

export function ProjectActivityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeProjectId, setActiveProjectId } = useActiveProjectStore();

  // Filter & Pagination state
  const [entityTypeFilter, setEntityTypeFilter] = useState<'ALL' | ActivityEntityType>('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | ActivityAction>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isLoadMoreMode, setIsLoadMoreMode] = useState(false);
  const [accumulatedLogs, setAccumulatedLogs] = useState<ActivityLogRecord[]>([]);

  const PAGE_LIMIT = 15;

  // 1. Fetch user projects to allow switching projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  // Resolve effective projectId
  const currentProjectId = useMemo(() => {
    if (projectId && projects.some((p) => p.id === projectId)) {
      return projectId;
    }
    if (activeProjectId && projects.some((p) => p.id === activeProjectId)) {
      return activeProjectId;
    }
    return projects.length > 0 ? projects[0].id : '';
  }, [projectId, activeProjectId, projects]);

  // Keep activeProjectId synchronized
  useEffect(() => {
    if (currentProjectId && currentProjectId !== activeProjectId) {
      setActiveProjectId(currentProjectId);
    }
  }, [currentProjectId, activeProjectId, setActiveProjectId]);

  // Sync URL if visiting /activity without :projectId
  useEffect(() => {
    if (!projectId && currentProjectId) {
      navigate(`/projects/${currentProjectId}/activity`, { replace: true });
    }
  }, [projectId, currentProjectId, navigate]);

  // Reset pagination & accumulated logs when project or API filters change
  useEffect(() => {
    setPage(1);
    setIsLoadMoreMode(false);
    setAccumulatedLogs([]);
  }, [currentProjectId, entityTypeFilter, actionFilter]);

  // 2. Fetch project details (for members map & project info)
  const { data: project } = useQuery({
    queryKey: ['project', currentProjectId],
    queryFn: () => getProject(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  // 3. Fetch Kanban columns & tasks (to enrich column/task names in activity metadata)
  const { data: columns = [] } = useQuery({
    queryKey: ['kanban', currentProjectId],
    queryFn: () => getBoard(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  // Build context maps for activity-formatter
  const formatterContext = useMemo<ActivityFormatterContext>(() => {
    const columnsMap = new Map<string, string>();
    const tasksMap = new Map<string, string>();
    const membersMap = new Map<string, string>();

    for (const col of columns) {
      columnsMap.set(col.id, col.name);
      for (const t of col.tasks || []) {
        tasksMap.set(t.id, t.title);
      }
    }

    for (const m of project?.members || []) {
      if (m.user?.id && m.user?.fullName) {
        membersMap.set(m.user.id, m.user.fullName);
      }
    }

    return { columnsMap, tasksMap, membersMap };
  }, [columns, project]);

  // 4. Fetch Activity Logs from Backend API
  const {
    data: activityResponse,
    isLoading: isLoadingLogs,
    isFetching: isFetchingLogs,
    isError,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: [
      'project-activity-logs',
      currentProjectId,
      page,
      PAGE_LIMIT,
      entityTypeFilter,
      actionFilter,
    ],
    queryFn: () =>
      getProjectActivityLogs(currentProjectId, {
        page,
        limit: PAGE_LIMIT,
        entityType: entityTypeFilter === 'ALL' ? undefined : entityTypeFilter,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
      }),
    enabled: Boolean(currentProjectId),
  });

  // Synchronize accumulatedLogs depending on whether user clicked "Load More" or switched page directly
  useEffect(() => {
    if (!activityResponse?.data) return;

    if (isLoadMoreMode && page > 1) {
      setAccumulatedLogs((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const nextItems = activityResponse.data.filter((item) => !existingIds.has(item.id));
        return [...prev, ...nextItems];
      });
    } else {
      setAccumulatedLogs(activityResponse.data);
    }
  }, [activityResponse, isLoadMoreMode, page]);

  const meta = activityResponse?.meta || {
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  };

  // Enrich & filter logs by searchQuery on client-side
  const formattedLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return accumulatedLogs
      .map((log) => ({
        log,
        info: formatActivityLog(log, formatterContext),
      }))
      .filter(({ log, info }) => {
        if (!q) return true;
        const actorName = (log.actor?.fullName || 'Hệ thống').toLowerCase();
        const desc = info.description.toLowerCase();
        const label = info.actionLabel.toLowerCase();
        const chipsText = info.detailChips.join(' ').toLowerCase();
        return (
          actorName.includes(q) ||
          desc.includes(q) ||
          label.includes(q) ||
          chipsText.includes(q)
        );
      });
  }, [accumulatedLogs, formatterContext, searchQuery]);

  // Group formatted logs by date header ("Hôm nay", "Hôm qua", etc.)
  const groupedLogs = useMemo(() => {
    const groups: {
      dateHeader: string;
      items: { log: ActivityLogRecord; info: FormattedActivityInfo }[];
    }[] = [];

    for (const entry of formattedLogs) {
      const header = formatDateGroupHeader(entry.log.createdAt);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.dateHeader !== header) {
        groups.push({ dateHeader: header, items: [entry] });
      } else {
        lastGroup.items.push(entry);
      }
    }

    return groups;
  }, [formattedLogs]);

  // Handlers for Load More & Page Navigation
  const handleLoadMore = () => {
    if (page < meta.totalPages && !isFetchingLogs) {
      setIsLoadMoreMode(true);
      setPage((prev) => prev + 1);
    }
  };

  const handleGoToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > meta.totalPages || targetPage === page) return;
    setIsLoadMoreMode(false);
    setPage(targetPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setEntityTypeFilter('ALL');
    setActionFilter('ALL');
    setSearchQuery('');
    setPage(1);
    setIsLoadMoreMode(false);
  };

  // Loading state on initial load
  if (isLoadingProjects || (Boolean(currentProjectId) && isLoadingLogs && page === 1 && accumulatedLogs.length === 0)) {
    return (
      <div className="activity-page-container loading-state">
        <div className="spinner-ring" style={{ margin: '60px auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
          Đang tải nhật ký hoạt động dự án...
        </p>
      </div>
    );
  }

  // Empty projects state
  if (!currentProjectId && projects.length === 0) {
    return (
      <div className="activity-page-container">
        <div className="members-empty-card">
          <div className="empty-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2>Chưa có dự án nào</h2>
          <p>Bạn cần tham gia hoặc tạo dự án trước để theo dõi dòng thời gian hoạt động.</p>
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
      <div className="activity-page-container">
        <div className="members-empty-card">
          <p style={{ color: '#ef4444', fontSize: '15px', fontWeight: 500 }}>
            Không thể tải nhật ký hoạt động của dự án hoặc bạn không có quyền truy cập.
          </p>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: '16px' }}
            onClick={() => refetchLogs()}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const hasActiveFilter =
    entityTypeFilter !== 'ALL' || actionFilter !== 'ALL' || searchQuery.trim().length > 0;

  const visibleActionOptions =
    entityTypeFilter === 'ALL'
      ? ACTION_FILTER_OPTIONS
      : ACTION_FILTER_OPTIONS.filter(
          (opt) => opt.group === 'ALL' || opt.group === entityTypeFilter,
        );

  const renderTabIcon = (val: 'ALL' | ActivityEntityType) => {
    switch (val) {
      case 'ALL':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
          </svg>
        );
      case 'TASK':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        );
      case 'PROJECT_MEMBER':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'KANBAN_COLUMN':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
        );
      case 'PROJECT':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
          </svg>
        );
    }
  };

  return (
    <div className="activity-page-container">
      {/* ── Page Header ── */}
      <div className="activity-header-card">
        <div className="activity-header-top-row">
          <div className="activity-title-group">
            <div className="members-breadcrumbs">
              <span className="breadcrumb-label">DỰ ÁN</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-sub">NHẬT KÝ HOẠT ĐỘNG</span>
            </div>
            <div className="activity-title-row">
              <h1 className="members-main-heading">Nhật ký hoạt động</h1>
              {projects.length > 0 && (
                <ProjectSelectDropdown
                  projects={projects}
                  currentProjectId={currentProjectId}
                  onSelectProject={(selectedId) => {
                    setActiveProjectId(selectedId);
                    navigate(`/projects/${selectedId}/activity`);
                  }}
                  variant="compact"
                />
              )}
              <div className="activity-total-pill" title="Tổng số sự kiện ghi nhận">
                <span className="activity-total-dot" />
                <span>
                  <strong>{meta.total}</strong> sự kiện
                </span>
              </div>
            </div>
            <p className="activity-sub-heading">
              Theo dõi lịch sử cập nhật dự án, thành viên, cột Kanban và công việc theo dòng thời gian.
            </p>
          </div>

          {/* Header Right Actions (Single balanced row) */}
          <div className="activity-header-actions">
            <button
              type="button"
              className="btn-activity-refresh"
              onClick={() => refetchLogs()}
              disabled={isFetchingLogs}
              title="Làm mới dòng thời gian"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isFetchingLogs ? 'spin-icon' : ''}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              className="btn-activity-kanban"
              onClick={() => navigate(`/projects/${currentProjectId}/board`)}
            >
              <span>Mở Bảng Kanban</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Entity Type Filter Tabs ── */}
        <div className="activity-entity-tabs">
          {ENTITY_TYPE_OPTIONS.map((opt) => {
            const active = entityTypeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`activity-entity-tab ${active ? 'active' : ''}`}
                onClick={() => {
                  setEntityTypeFilter(opt.value);
                  if (opt.value !== 'ALL') {
                    setActionFilter('ALL');
                  }
                }}
              >
                <span className="activity-tab-icon">{renderTabIcon(opt.value)}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search & Action Filter Bar ── */}
      <div className="activity-controls-card">
        <div className="activity-search-box">
          <svg
            className="activity-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="activity-search-input"
            placeholder="Tìm theo tên thành viên, hành động hoặc nội dung công việc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="activity-search-clear"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </div>

        <div className="activity-filter-right">
          <div className="activity-filter-group">
            <label htmlFor="activity-action-filter" className="activity-filter-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Hành động:</span>
            </label>
            <select
              id="activity-action-filter"
              className="activity-action-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as 'ALL' | ActivityAction)}
            >
              {visibleActionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              className="btn-activity-clear-filter"
              onClick={handleResetFilters}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Activity Timeline Feed ── */}
      {groupedLogs.length === 0 ? (
        <div className="activity-empty-state">
          <div className="activity-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3>Không tìm thấy hoạt động nào</h3>
          <p>
            {hasActiveFilter
              ? 'Không có bản ghi hoạt động nào khớp với bộ lọc hiện tại của bạn.'
              : 'Dự án này chưa có hoạt động nào được ghi nhận.'}
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 12 }}
              onClick={handleResetFilters}
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="activity-timeline-wrapper">
          {groupedLogs.map((group) => (
            <div key={group.dateHeader} className="activity-date-group">
              <div className="activity-date-sticky-header">
                <span className="activity-date-badge">{group.dateHeader}</span>
                <span className="activity-date-count">
                  {group.items.length} hoạt động
                </span>
              </div>

              <div className="activity-timeline-list">
                {group.items.map(({ log, info }) => {
                  const actorName = log.actor?.fullName || 'Hệ thống';
                  const actorAvatar = getMediaUrl(log.actor?.avatarUrl);

                  return (
                    <div key={log.id} className="activity-timeline-item">
                      {/* Left timeline node & connector */}
                      <div className="activity-timeline-rail">
                        <div className={`activity-timeline-dot tone-${info.tone}`}>
                          {renderEntityIcon(info.iconType)}
                        </div>
                        <div className="activity-timeline-line" />
                      </div>

                      {/* Right content card */}
                      <div className="activity-timeline-card">
                        <div className="activity-card-top">
                          <div className="activity-actor-wrap">
                            {actorAvatar ? (
                              <img
                                src={actorAvatar}
                                alt={actorName}
                                className="activity-actor-avatar"
                              />
                            ) : (
                              <div className="activity-actor-avatar activity-actor-initials">
                                {getInitials(actorName)}
                              </div>
                            )}

                            <div className="activity-actor-meta">
                              <div className="activity-actor-line">
                                <span className="activity-actor-name">{actorName}</span>
                                <span className={`activity-action-badge tone-${info.tone}`}>
                                  {info.actionLabel}
                                </span>
                                <span className="activity-entity-pill">
                                  {info.entityLabel}
                                </span>
                              </div>
                              <p className="activity-description-text">
                                {info.description}
                              </p>
                            </div>
                          </div>

                          <div
                            className="activity-time-box"
                            title={formatExactDateTime(log.createdAt)}
                          >
                            <span className="activity-time-relative">
                              {formatRelativeTime(log.createdAt)}
                            </span>
                            <span className="activity-time-exact">
                              {formatExactDateTime(log.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Metadata detail chips OR quick task link */}
                        {(info.detailChips.length > 0 || (info.canNavigateToTask && log.entityId)) && (
                          <div className="activity-card-footer">
                            <div className="activity-chips-row">
                              {info.detailChips.map((chip, idx) => (
                                <span key={idx} className="activity-detail-chip">
                                  {chip}
                                </span>
                              ))}
                            </div>

                            {info.canNavigateToTask && log.entityId && (
                              <button
                                type="button"
                                className="activity-task-link-btn"
                                onClick={() =>
                                  navigate(`/projects/${currentProjectId}/tasks/${log.entityId}`)
                                }
                              >
                                <span>Chi tiết công việc</span>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                  <polyline points="12 5 19 12 12 19" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ── Load More & Pagination Controls ── */}
          <div className="activity-pagination-card">
            <div className="activity-pagination-summary">
              Đang hiển thị <strong>{formattedLogs.length}</strong> / <strong>{meta.total}</strong> hoạt động
              {meta.totalPages > 1 && (
                <span>
                  {' '}
                  • Trang <strong>{meta.page}</strong> / <strong>{meta.totalPages}</strong>
                </span>
              )}
            </div>

            {/* Load More Button (accumulates next page into current feed) */}
            {page < meta.totalPages && (
              <div className="activity-load-more-wrap">
                <button
                  type="button"
                  className="btn-activity-load-more"
                  onClick={handleLoadMore}
                  disabled={isFetchingLogs}
                >
                  {isFetchingLogs ? (
                    <>
                      <span className="spinner-ring-sm" />
                      <span>Đang tải thêm...</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <span>
                        Tải thêm hoạt động (Trang {page + 1}/{meta.totalPages})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Direct Page Navigation Bar */}
            {meta.totalPages > 1 && (
              <div className="activity-page-nav">
                <button
                  type="button"
                  className="activity-page-btn"
                  disabled={page <= 1 || isFetchingLogs}
                  onClick={() => handleGoToPage(page - 1)}
                >
                  ← Trang trước
                </button>

                <div className="activity-page-numbers">
                  {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (meta.totalPages <= 7) return true;
                      return p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1;
                    })
                    .map((p, index, arr) => {
                      const prevPage = arr[index - 1];
                      const showEllipsis = prevPage && p - prevPage > 1;
                      return (
                        <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {showEllipsis && <span className="activity-page-ellipsis">…</span>}
                          <button
                            type="button"
                            className={`activity-page-num ${p === page && !isLoadMoreMode ? 'active' : ''}`}
                            onClick={() => handleGoToPage(p)}
                            disabled={isFetchingLogs}
                          >
                            {p}
                          </button>
                        </span>
                      );
                    })}
                </div>

                <button
                  type="button"
                  className="activity-page-btn"
                  disabled={page >= meta.totalPages || isFetchingLogs}
                  onClick={() => handleGoToPage(page + 1)}
                >
                  Trang sau →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
