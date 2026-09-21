import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import logo from '../../assets/logo.png';
import { getMediaUrl } from '../../api/http';
import { logout as logoutApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { ChangePasswordModal } from '../../features/profile/components/ChangePasswordModal';
import { toast } from '../ui/toast.store';
import { useActiveProjectStore } from '../../features/projects/store/active-project.store';
import { getProjects } from '../../features/projects/api/projects.api';
import { getProjectTheme } from '../../features/projects/utils/project-theme.util';

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const { activeProjectId, setActiveProjectId } = useActiveProjectStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lấy danh sách dự án gần đây của người dùng
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const recentProjects = useMemo(() => {
    return [...projects]
      .filter((p) => p.status !== 'ARCHIVED')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [projects]);

  const archivedProjects = useMemo(() => {
    return [...projects]
      .filter((p) => p.status === 'ARCHIVED')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [projects]);

  const avatarUrl = getMediaUrl(user?.avatarUrl);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  async function handleLogout() {
    try {
      await logoutApi();
    } catch {
      // ignore
    } finally {
      logout();
      toast.info('Đã đăng xuất khỏi hệ thống');
      navigate('/login', { replace: true });
    }
  }

  const isDashboardActive = location.pathname === '/dashboard' || location.pathname.includes('/dashboard');
  const isProjectsActive = location.pathname === '/projects';
  const isBoardActive = location.pathname.includes('/board') || location.pathname.includes('/kanban');
  const isMembersActive = location.pathname.includes('/members');
  const isAdminActive = location.pathname.startsWith('/admin');

  return (
    <div className="app-shell">
      {/* ── Left Sidebar ── */}
      <aside className="sidebar">
        {/* Brand Logo */}
        <Link
          to={activeProjectId ? `/projects/${activeProjectId}/dashboard` : '/dashboard'}
          className="sidebar-brand"
          title="Trang chủ Dashboard"
        >
          <img src={logo} alt="TTeamFlow" className="sidebar-logo-img" />
        </Link>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <Link
            to={activeProjectId ? `/projects/${activeProjectId}/dashboard` : '/dashboard'}
            className={`sidebar-nav-item ${isDashboardActive ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            <span>Tổng quan</span>
          </Link>

          <Link
            to="/projects"
            className={`sidebar-nav-item ${isProjectsActive ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            </svg>
            <span>{user?.systemRole === 'ADMIN' ? 'Quản lý dự án' : 'Dự án của tôi'}</span>
          </Link>

          <Link
            to={activeProjectId ? `/projects/${activeProjectId}/board` : '/board'}
            className={`sidebar-nav-item ${isBoardActive ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
            <span>Bảng Kanban</span>
          </Link>

          <Link
            to={activeProjectId ? `/projects/${activeProjectId}/members` : '/members'}
            className={`sidebar-nav-item ${isMembersActive ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Thành viên</span>
          </Link>

          <div className="sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Nhật ký hoạt động</span>
          </div>

          {/* Menu Quản trị người dùng: Chỉ hiển thị với systemRole === 'ADMIN' */}
          {user?.systemRole === 'ADMIN' && (
            <Link
              to="/admin/users"
              className={`sidebar-nav-item ${isAdminActive ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span style={{ flex: 1 }}>Quản trị người dùng</span>
              <span className="sidebar-pro-badge" style={{ background: '#4338CA', color: '#fff' }}>ADMIN</span>
            </Link>
          )}
        </nav>

        {/* Recent Projects Section */}
        <div className="sidebar-section">
          <span className="sidebar-section-title">DỰ ÁN GẦN ĐÂY</span>
          {recentProjects.length > 0 ? (
            recentProjects.map((p) => {
              const theme = getProjectTheme(p.projectKey || p.id);
              const isCurrentActive = activeProjectId === p.id;
              return (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}/board`}
                  onClick={() => setActiveProjectId(p.id)}
                  className={`sidebar-fav-item ${isCurrentActive ? 'active' : ''}`}
                  title={p.name}
                >
                  <span
                    className="fav-dot"
                    style={{ background: theme.badgeBg }}
                  />
                  <span className="sidebar-fav-name">{p.name}</span>
                </Link>
              );
            })
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8', padding: '4px 6px', display: 'block' }}>
              Chưa có dự án nào
            </span>
          )}
        </div>

        {/* Archived Projects Section */}
        <div className="sidebar-section">
          <span className="sidebar-section-title">DỰ ÁN ĐÃ LƯU TRỮ</span>
          {archivedProjects.length > 0 ? (
            archivedProjects.map((p) => {
              const isCurrentActive = activeProjectId === p.id;
              return (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}/board`}
                  onClick={() => setActiveProjectId(p.id)}
                  className={`sidebar-fav-item archived-item ${isCurrentActive ? 'active' : ''}`}
                  title={`${p.name} (Đã lưu trữ)`}
                >
                  <span
                    className="fav-dot gray"
                    style={{ background: '#94a3b8' }}
                  />
                  <span className="sidebar-fav-name" style={{ color: 'var(--gray-500)' }}>
                    {p.name}
                  </span>
                </Link>
              );
            })
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8', padding: '4px 6px', display: 'block' }}>
              Chưa có dự án lưu trữ
            </span>
          )}
        </div>
      </aside>

      {/* ── Main Wrapper (Header + Content) ── */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <header className="top-header" style={{ justifyContent: 'flex-end' }}>
          <div className="top-header-actions">

            <button className="top-icon-btn" title="Trợ giúp" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>

            <button className="top-icon-btn with-badge" title="Thông báo" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="notif-dot"></span>
            </button>

            {/* User Dropdown Menu */}
            <div className="top-user-menu-wrap" ref={dropdownRef}>
              <button
                type="button"
                className="top-user-avatar-btn"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                title={user?.fullName || 'Tài khoản cá nhân'}
              >
                <div className="top-user-avatar-wrap">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.fullName || 'Avatar'}
                      className="top-user-avatar"
                    />
                  ) : (
                    <div className="top-user-avatar top-user-avatar-initials">
                      {getInitials(user?.fullName)}
                    </div>
                  )}
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-user-header">
                    <div className="dropdown-user-name">{user?.fullName || 'Người dùng'}</div>
                    <div className="dropdown-user-email">{user?.email}</div>
                    <span className="dropdown-user-role">
                      {user?.systemRole === 'ADMIN' ? 'Quản trị hệ thống' : 'Thành viên'}
                    </span>
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/profile');
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Profile</span>
                  </button>
                  {user?.systemRole === 'ADMIN' && (
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigate('/admin/users');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Quản trị người dùng</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setShowChangePasswordModal(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Thay đổi mật khẩu</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item text-danger"
                    id="logout-btn"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="content">
          <Outlet />
        </main>
      </div>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={() => setShowChangePasswordModal(false)}
        />
      )}
    </div>
  );
}
