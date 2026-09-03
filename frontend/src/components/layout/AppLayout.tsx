import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { logout as logoutApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../features/auth/store/auth.store';

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

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
        <div className="sidebar-brand">
          <img src={logo} alt="TTeamFlow" className="sidebar-logo-img" />
          <span className="sidebar-brand-title">TTeamFlow</span>
        </div>

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

        {/* Footer User Profile */}
        <div className="sidebar-footer">
          <div className="sidebar-user-row">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces"
              alt="Alex Rivera"
              className="sidebar-user-avatar"
            />
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">
                {user?.fullName || 'Alex Rivera'}
              </span>
              <span className="sidebar-user-role">
                {user?.systemRole === 'ADMIN' ? 'Quản trị hệ thống' : 'Thành viên'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
              title="Đăng xuất"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
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

            <div className="top-user-avatar-wrap">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces"
                alt="User"
                className="top-user-avatar"
              />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
