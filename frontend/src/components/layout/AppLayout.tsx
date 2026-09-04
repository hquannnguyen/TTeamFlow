import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { getMediaUrl } from '../../api/http';
import { logout as logoutApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { ChangePasswordModal } from '../../features/profile/components/ChangePasswordModal';

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      navigate('/login', { replace: true });
    }
  }

  const isDashboardActive = location.pathname === '/dashboard' || location.pathname.includes('/dashboard');
  const isProjectsActive = location.pathname === '/projects';
  const isBoardActive = location.pathname.includes('/board');

  return (
    <div className="app-shell">
      {/* ── Left Sidebar ── */}
      <aside className="sidebar">
        {/* Brand Logo */}
        <Link to="/dashboard" className="sidebar-brand" title="Trang chủ Dashboard">
          <img src={logo} alt="TTeamFlow" className="sidebar-logo-img" />
        </Link>

        {/* Workspace Selector */}
        <div className="workspace-box">
          <span className="workspace-label">KHÔNG GIAN LÀM VIỆC</span>
          <div className="workspace-dropdown">
            <span className="workspace-name">Acme Global</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <Link
            to="/dashboard"
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
            <span>Dự án của tôi</span>
          </Link>

          <Link
            to="/projects"
            className={`sidebar-nav-item ${isBoardActive ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
            <span>Bảng Kanban</span>
          </Link>

          <div className="sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Thành viên</span>
          </div>

          <div className="sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Nhật ký hoạt động</span>
          </div>

          <div className="sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span style={{ flex: 1 }}>Quản trị hệ thống</span>
            <span className="sidebar-pro-badge">PRO</span>
          </div>
        </nav>

        {/* Favorite Projects Section */}
        <div className="sidebar-section">
          <span className="sidebar-section-title">DỰ ÁN YÊU THÍCH</span>
          <div className="sidebar-fav-item">
            <span className="fav-dot green"></span>
            <span>TTeamFlow Web</span>
          </div>
          <div className="sidebar-fav-item">
            <span className="fav-dot purple"></span>
            <span>Mobile Refactor</span>
          </div>
        </div>
      </aside>

      {/* ── Main Wrapper (Header + Content) ── */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <header className="top-header">
          <div className="top-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm nhiệm vụ, dự án, thành viên... (Cmd + K)"
              className="top-search-input"
            />
            <kbd className="top-search-kbd">⌘K</kbd>
          </div>

          <div className="top-header-actions">
            <button className="btn-create-task" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Tạo nhiệm vụ</span>
            </button>

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
