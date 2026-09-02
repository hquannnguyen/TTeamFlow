import { Link, Outlet, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { logout as logoutApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../features/auth/store/auth.store';

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      // Revoke refresh token server-side first
      await logoutApi();
    } catch {
      // If the server call fails (e.g. already expired), still clear locally
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <img src={logo} alt="TTeamFlow" className="sidebar-logo-img" />
        </div>

        <nav>
          <Link to="/projects" className="sidebar-link">
            {/* Grid icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/>
              <rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
            </svg>
            Dự án
          </Link>
        </nav>

        <div className="sidebar-footer">
          {/* User info */}
          {user && (
            <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--gray-500)', borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontWeight: 500, color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          )}

          <button
            className="sidebar-link"
            onClick={handleLogout}
            id="logout-btn"
            style={{ cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
          >
            {/* LogOut icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
