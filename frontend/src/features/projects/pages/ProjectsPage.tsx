import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProjects,
  archiveProject,
  restoreProject,
  deleteProject,
  type Project,
  type ProjectStatus,
} from '../api/projects.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { getMediaUrl } from '../../../api/http';
import { toast } from '../../../components/ui/toast.store';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectListItem } from '../components/ProjectListItem';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { EditProjectModal } from '../components/EditProjectModal';
import { ConfirmActionModal } from '../components/ConfirmActionModal';

type FilterTab = 'ALL' | 'ACTIVE' | 'ARCHIVED';
type ViewMode = 'grid' | 'list';

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.systemRole === 'ADMIN';

  // Filter States
  const [activeTab, setActiveTab] = useState<FilterTab>('ACTIVE');
  const [ownerFilter, setOwnerFilter] = useState<string>('all'); // 'all' | 'my' | <userId>
  const [ownerSearch, setOwnerSearch] = useState('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const ownerDropdownRef = useRef<HTMLDivElement>(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'archive' | 'restore' | 'delete';
    project: Project;
  } | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(event.target as Node)) {
        setIsOwnerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Query: fetch projects (admin fetches scope=all by default to inspect and filter all projects & owners)
  const statusParam: ProjectStatus | undefined =
    activeTab === 'ALL' ? undefined : (activeTab as ProjectStatus);
  const currentScope = isAdmin ? 'all' : 'my';

  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['projects', statusParam, currentScope],
    queryFn: () => getProjects(statusParam, currentScope),
  });

  // Extract unique owners from projects list
  const availableOwners = useMemo(() => {
    const map = new Map<
      string,
      { id: string; fullName: string; email?: string; avatarUrl?: string | null; count: number }
    >();
    projects.forEach((p) => {
      if (p.createdBy) {
        const existing = map.get(p.createdBy.id);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(p.createdBy.id, {
            id: p.createdBy.id,
            fullName: p.createdBy.fullName,
            email: p.createdBy.email,
            avatarUrl: p.createdBy.avatarUrl,
            count: 1,
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [projects]);

  const filteredOwnersList = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return availableOwners;
    return availableOwners.filter(
      (o) =>
        o.fullName.toLowerCase().includes(q) ||
        (o.email && o.email.toLowerCase().includes(q)),
    );
  }, [availableOwners, ownerSearch]);

  // Client-side filtering by Owner and Search Query
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Filter by Owner (for Admin)
    if (isAdmin) {
      if (ownerFilter === 'my') {
        result = result.filter(
          (p) =>
            p.createdBy?.id === currentUser?.id ||
            p.members?.some((m) => m.user?.id === currentUser?.id && m.role === 'OWNER'),
        );
      } else if (ownerFilter !== 'all') {
        result = result.filter((p) => p.createdBy?.id === ownerFilter);
      }
    }

    // Filter by Search Query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.projectKey.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [projects, isAdmin, ownerFilter, currentUser?.id, searchQuery]);

  // Label and active filter helpers
  const selectedOwner = availableOwners.find((o) => o.id === ownerFilter);
  const selectedOwnerLabel =
    ownerFilter === 'all'
      ? 'Tất cả'
      : ownerFilter === 'my'
        ? 'Của tôi'
        : selectedOwner?.fullName || 'Đã chọn';

  const statusLabel =
    activeTab === 'ACTIVE'
      ? 'Đang hoạt động'
      : activeTab === 'ARCHIVED'
        ? 'Đã lưu trữ'
        : 'Tất cả';

  const hasActiveFilters =
    activeTab !== 'ACTIVE' || (isAdmin && ownerFilter !== 'all') || searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setActiveTab('ACTIVE');
    setOwnerFilter('all');
    setSearchQuery('');
  };

  function getInitials(name: string) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }


  // Determine user's role in a given project
  function getUserRoleInProject(project: Project) {
    if (currentUser?.systemRole === 'ADMIN') return 'OWNER';
    const member = project.members?.find((m) => m.user?.id === currentUser?.id);
    return member?.role || project.members?.[0]?.role || 'MEMBER';
  }

  // Handlers
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
  };

  const handleOpenArchive = (project: Project) => {
    setConfirmAction({ type: 'archive', project });
  };

  const handleOpenRestore = (project: Project) => {
    setConfirmAction({ type: 'restore', project });
  };

  const handleOpenDelete = (project: Project) => {
    setConfirmAction({ type: 'delete', project });
  };

  // Perform confirmed action
  const handleExecuteAction = async () => {
    if (!confirmAction) return;
    const { type, project } = confirmAction;

    try {
      if (type === 'archive') {
        await archiveProject(project.id);
        toast.success(`Đã lưu trữ dự án "${project.name}"`);
      } else if (type === 'restore') {
        await restoreProject(project.id);
        toast.success(`Đã khôi phục dự án "${project.name}"`);
      } else if (type === 'delete') {
        await deleteProject(project.id);
        toast.success(`Đã xóa vĩnh viễn dự án "${project.name}"`);
      }
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch {
      // Re-throw so modal can display error banner
      throw new Error('Thao tác thất bại. Vui lòng kiểm tra lại quyền hạn.');
    }
  };

  return (
    <div className="projects-page-container">
      {/* 1. Header Section */}
      <div className="projects-page-header">
        <div className="projects-page-header-info">
          <div className="projects-page-title-row">
            <h1 className="projects-page-title">{isAdmin ? 'Quản lý dự án' : 'Dự án của tôi'}</h1>
            {!isLoading && (
              <span className="projects-count-pill" title="Tổng số dự án hiển thị">
                {filteredProjects.length}
              </span>
            )}
          </div>
          <p className="projects-page-subtitle">
            {isAdmin
              ? 'Quản trị toàn bộ không gian làm việc trên hệ thống và theo dõi tiến độ các dự án.'
              : 'Quản lý và theo dõi tiến độ các không gian làm việc của bạn.'}
          </p>
        </div>

        <button
          type="button"
          className="btn-create-project"
          onClick={() => setIsCreateOpen(true)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Tạo dự án mới</span>
        </button>
      </div>

      {/* 2. Controls / Toolbar Section */}
      <div className="projects-toolbar">
        {/* Left: Search input */}
        <div className="projects-search-wrap">
          <svg
            className="projects-search-icon"
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
            className="projects-search-input"
            placeholder="Tìm kiếm theo tên hoặc mã dự án..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="projects-search-clear"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Right: Status Dropdown, Owner Dropdown (for Admin), Reset button, Divider & View Toggle */}
        <div className="projects-toolbar-right">
          {/* 1. Status Dropdown Filter */}
          <div className="projects-filter-wrap" ref={statusDropdownRef}>
            <button
              type="button"
              className={`projects-filter-btn ${activeTab !== 'ACTIVE' ? 'has-filter' : ''} ${isStatusDropdownOpen ? 'open' : ''}`}
              onClick={() => {
                setIsStatusDropdownOpen((prev) => !prev);
                setIsOwnerDropdownOpen(false);
              }}
              aria-expanded={isStatusDropdownOpen}
              title="Lọc theo trạng thái dự án"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                Trạng thái
                {activeTab !== 'ACTIVE' && (
                  <span className="filter-val-badge">: {statusLabel}</span>
                )}
              </span>
              <svg className="filter-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isStatusDropdownOpen && (
              <div className="projects-filter-dropdown" role="menu">
                <div className="projects-filter-dropdown-header">Trạng thái dự án</div>
                <button
                  type="button"
                  role="menuitem"
                  className={`projects-filter-dropdown-item ${activeTab === 'ACTIVE' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('ACTIVE');
                    setIsStatusDropdownOpen(false);
                  }}
                >
                  <div className="filter-item-left">
                    <span className="filter-dot active" />
                    <div className="filter-item-info">
                      <span className="filter-item-title">Đang hoạt động</span>
                      <span className="filter-item-sub">Các dự án đang triển khai</span>
                    </div>
                  </div>
                  {activeTab === 'ACTIVE' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className={`projects-filter-dropdown-item ${activeTab === 'ALL' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('ALL');
                    setIsStatusDropdownOpen(false);
                  }}
                >
                  <div className="filter-item-left">
                    <span className="filter-dot all" />
                    <div className="filter-item-info">
                      <span className="filter-item-title">Tất cả</span>
                      <span className="filter-item-sub">Bao gồm đang chạy & lưu trữ</span>
                    </div>
                  </div>
                  {activeTab === 'ALL' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className={`projects-filter-dropdown-item ${activeTab === 'ARCHIVED' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('ARCHIVED');
                    setIsStatusDropdownOpen(false);
                  }}
                >
                  <div className="filter-item-left">
                    <span className="filter-dot archived" />
                    <div className="filter-item-info">
                      <span className="filter-item-title">Đã lưu trữ</span>
                      <span className="filter-item-sub">Dự án đã đóng hoặc tạm ngưng</span>
                    </div>
                  </div>
                  {activeTab === 'ARCHIVED' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 2. Owner Dropdown Filter (Admin only) */}
          {isAdmin && (
            <div className="projects-filter-wrap" ref={ownerDropdownRef}>
              <button
                type="button"
                className={`projects-filter-btn ${ownerFilter !== 'all' ? 'has-filter' : ''} ${isOwnerDropdownOpen ? 'open' : ''}`}
                onClick={() => {
                  setIsOwnerDropdownOpen((prev) => !prev);
                  setIsStatusDropdownOpen(false);
                }}
                aria-expanded={isOwnerDropdownOpen}
                title="Lọc theo người tạo / chủ sở hữu dự án"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>
                  Chủ sở hữu
                  {ownerFilter !== 'all' && (
                    <span className="filter-val-badge">: {selectedOwnerLabel}</span>
                  )}
                </span>
                <svg className="filter-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isOwnerDropdownOpen && (
                <div className="projects-filter-dropdown owner-dropdown" role="menu">
                  <div className="projects-filter-dropdown-header">Phạm vi sở hữu</div>
                  <button
                    type="button"
                    role="menuitem"
                    className={`projects-filter-dropdown-item ${ownerFilter === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setOwnerFilter('all');
                      setIsOwnerDropdownOpen(false);
                    }}
                  >
                    <div className="filter-item-left">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <div className="filter-item-info">
                        <span className="filter-item-title">Tất cả chủ sở hữu</span>
                        <span className="filter-item-sub">Toàn bộ dự án hệ thống</span>
                      </div>
                    </div>
                    <span className="filter-item-badge">{projects.length}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    className={`projects-filter-dropdown-item ${ownerFilter === 'my' ? 'active' : ''}`}
                    onClick={() => {
                      setOwnerFilter('my');
                      setIsOwnerDropdownOpen(false);
                    }}
                  >
                    <div className="filter-item-left">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <div className="filter-item-info">
                        <span className="filter-item-title">Dự án của tôi</span>
                        <span className="filter-item-sub">Dự án do bạn tạo</span>
                      </div>
                    </div>
                    <span className="filter-item-badge">
                      {
                        projects.filter(
                          (p) =>
                            p.createdBy?.id === currentUser?.id ||
                            p.members?.some((m) => m.user?.id === currentUser?.id && m.role === 'OWNER'),
                        ).length
                      }
                    </span>
                  </button>

                  {availableOwners.length > 0 && (
                    <>
                      <div className="projects-filter-dropdown-divider" />
                      <div className="projects-filter-dropdown-header">Chủ sở hữu cụ thể</div>

                      {availableOwners.length > 4 && (
                        <div className="owner-search-wrap">
                          <svg className="owner-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input
                            type="text"
                            className="owner-search-input"
                            placeholder="Tìm chủ sở hữu..."
                            value={ownerSearch}
                            onChange={(e) => setOwnerSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}

                      <div className="owner-list-scroll">
                        {filteredOwnersList.map((owner) => (
                          <button
                            key={owner.id}
                            type="button"
                            role="menuitem"
                            className={`projects-filter-dropdown-item ${ownerFilter === owner.id ? 'active' : ''}`}
                            onClick={() => {
                              setOwnerFilter(owner.id);
                              setIsOwnerDropdownOpen(false);
                            }}
                          >
                            <div className="filter-item-left">
                              {getMediaUrl(owner.avatarUrl) ? (
                                <img
                                  src={getMediaUrl(owner.avatarUrl)!}
                                  alt={owner.fullName}
                                  className="owner-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="owner-avatar-pill">{getInitials(owner.fullName)}</span>
                              )}
                              <div className="filter-item-info">
                                <span className="filter-item-title">{owner.fullName}</span>
                                {owner.email && <span className="filter-item-sub">{owner.email}</span>}
                              </div>
                            </div>
                            <span className="filter-item-badge">{owner.count}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Reset filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="projects-filter-reset-btn"
              onClick={handleResetFilters}
              title="Đặt lại các bộ lọc về mặc định"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Đặt lại</span>
            </button>
          )}

          {/* 4. Divider */}
          <div className="projects-toolbar-divider" />

          {/* View Mode Toggle (Grid vs List) */}
          <div className="projects-view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Xem dạng thẻ (Grid)"
              aria-label="Xem dạng thẻ"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Xem dạng danh sách (List)"
              aria-label="Xem dạng danh sách"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
                <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
                <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Content: Skeletons, Error, Empty, or Cards/List */}
      {isLoading ? (
        <div className="projects-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="project-card-skeleton">
              <div className="skeleton-bar" style={{ height: 4, width: '100%' }} />
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="skeleton-box" style={{ width: 48, height: 28, borderRadius: 6 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="skeleton-box" style={{ width: '70%', height: 18, borderRadius: 4 }} />
                    <div className="skeleton-box" style={{ width: '40%', height: 12, borderRadius: 4 }} />
                  </div>
                </div>
                <div className="skeleton-box" style={{ width: '100%', height: 36, borderRadius: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <div className="skeleton-box" style={{ width: 80, height: 24, borderRadius: 12 }} />
                  <div className="skeleton-box" style={{ width: 70, height: 28, borderRadius: 6 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="projects-error-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
          </svg>
          <h3>Không thể tải danh sách dự án</h3>
          <p>Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng thử tải lại.</p>
          <button type="button" className="btn-retry" onClick={() => refetch()}>
            Tải lại
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="projects-empty-state">
          <div className="empty-icon-wrap">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          {searchQuery || (isAdmin && ownerFilter !== 'all') ? (
            <>
              <h3>Không tìm thấy dự án phù hợp</h3>
              <p>
                {searchQuery
                  ? `Không có kết quả nào khớp với từ khóa "${searchQuery}".`
                  : `Không có dự án nào thuộc chủ sở hữu "${selectedOwnerLabel}".`}
              </p>
              <button
                type="button"
                className="btn-clear-filter"
                onClick={handleResetFilters}
              >
                Đặt lại bộ lọc
              </button>
            </>
          ) : activeTab === 'ARCHIVED' ? (
            <>
              <h3>Chưa có dự án nào được lưu trữ</h3>
              <p>Các dự án đã hoàn thành hoặc tạm ngưng được lưu trữ sẽ xuất hiện ở đây.</p>
            </>
          ) : (
            <>
              <h3>{isAdmin ? 'Chưa có dự án nào trong hệ thống' : 'Bắt đầu với dự án đầu tiên của bạn'}</h3>
              <p>
                {isAdmin
                  ? 'Hiện chưa có dự án nào được tạo trong hệ thống hoặc không có dự án nào phù hợp với bộ lọc.'
                  : 'Tạo một không gian làm việc để quản lý công việc nhóm, quy trình Kanban và theo dõi tiến độ một cách hiệu quả.'}
              </p>
              <button
                type="button"
                className="btn-create-project primary"
                onClick={() => setIsCreateOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Tạo dự án mới</span>
              </button>
            </>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              currentUserRole={getUserRoleInProject(project)}
              onEdit={handleOpenEdit}
              onArchive={handleOpenArchive}
              onRestore={handleOpenRestore}
              onDelete={handleOpenDelete}
            />
          ))}
        </div>
      ) : (
        <div className="projects-list-container">
          <div className="project-list-header">
            <div className="project-list-col-info">Tên & Mã dự án</div>
            <div className="project-list-col-role">Vai trò</div>
            <div className="project-list-col-progress">Tiến độ</div>
            <div className="project-list-col-status">Trạng thái</div>
            <div className="project-list-col-members">Thành viên</div>
            <div className="project-list-col-date">Cập nhật</div>
            <div className="project-list-col-actions">Thao tác</div>
          </div>
          <div className="project-list-body">
            {filteredProjects.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                currentUserRole={getUserRoleInProject(project)}
                onEdit={handleOpenEdit}
                onArchive={handleOpenArchive}
                onRestore={handleOpenRestore}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. Modals */}
      {isCreateOpen && (
        <CreateProjectModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}

      {confirmAction && (
        <ConfirmActionModal
          title={
            confirmAction.type === 'archive'
              ? `Lưu trữ dự án "${confirmAction.project.name}"?`
              : confirmAction.type === 'restore'
                ? `Khôi phục dự án "${confirmAction.project.name}"?`
                : `Xóa vĩnh viễn dự án "${confirmAction.project.name}"?`
          }
          message={
            confirmAction.type === 'archive'
              ? 'Dự án này sẽ được chuyển vào mục lưu trữ. Thành viên vẫn có thể xem lại hoặc bạn có thể khôi phục bất cứ lúc nào.'
              : confirmAction.type === 'restore'
                ? 'Dự án sẽ hoạt động trở lại bình thường và xuất hiện trên danh sách các dự án đang hoạt động.'
                : 'CẢNH BÁO: Toàn bộ danh sách cột, công việc, bình luận và dữ liệu liên quan sẽ bị xóa hoàn toàn khỏi hệ thống và KHÔNG THỂ khôi phục lại!'
          }
          confirmText={
            confirmAction.type === 'archive'
              ? 'Lưu trữ dự án'
              : confirmAction.type === 'restore'
                ? 'Khôi phục dự án'
                : 'Xác nhận xóa vĩnh viễn'
          }
          confirmVariant={
            confirmAction.type === 'delete'
              ? 'danger'
              : confirmAction.type === 'archive'
                ? 'warning'
                : 'primary'
          }
          onConfirm={handleExecuteAction}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
