import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/auth.store';

export function AppLayout() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>PM</h2>
        <nav>
          <Link to="/projects">Dự án</Link>
        </nav>
        <button className="secondary" onClick={logout}>
          Đăng xuất
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
