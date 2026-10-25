import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/logo.png';
import { useTheme } from '../../../hooks/useTheme';
import { LoginForm } from './LoginPage';
import { RegisterForm } from './RegisterPage';

/**
 * Một card duy nhất chứa cả form đăng nhập và đăng ký.
 * Route /login và /register cùng render component này (xem router.tsx),
 * nên khi chuyển trang lớp overlay trượt qua lại thay vì tải lại trang.
 */
export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = pathname === '/register' ? 'register' : 'login';

  const { theme, toggle } = useTheme();
  const go = (to: '/login' | '/register') => navigate(to, { replace: true });

  return (
    <div className="auth-stage">
      <button
        type="button"
        className="auth-theme-toggle"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
      >
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
      <img src={logo} alt="TTeamFlow" className="auth-mobile-logo" />
      <div className={`auth-card2 mode-${mode}`}>
        {/* Login form (left) */}
        <section className="auth-pane auth-pane--login" aria-hidden={mode !== 'login'}>
          <div className="auth-pane-inner">
            <LoginForm onSwitch={() => go('/register')} />
          </div>
        </section>

        {/* Register form (right) */}
        <section className="auth-pane auth-pane--register" aria-hidden={mode !== 'register'}>
          <div className="auth-pane-inner">
            <RegisterForm onSwitch={() => go('/login')} />
          </div>
        </section>

        {/* Sliding overlay */}
        <aside className="auth-overlay" aria-hidden="true">
          <i className="auth-circle auth-circle--tr" />
          <i className="auth-circle auth-circle--bl" />

          <div className="auth-overlay-brand">
            <img src={logo} alt="TTeamFlow" className="auth-overlay-logo" />
          </div>

          <div className="auth-overlay-msg auth-overlay-msg--login">
            <h2>Chào mừng trở lại!</h2>
            <p>Đã có tài khoản? Đăng nhập để tiếp tục quản lý dự án cùng nhóm của bạn.</p>
            <button type="button" className="auth-ghost" tabIndex={mode === 'register' ? 0 : -1} onClick={() => go('/login')}>
              Đăng nhập
            </button>
          </div>

          <div className="auth-overlay-msg auth-overlay-msg--register">
            <h2>Xin chào bạn mới!</h2>
            <p>Tạo tài khoản và bắt đầu hành trình làm việc nhóm gọn gàng, minh bạch cùng TTeamFlow.</p>
            <button type="button" className="auth-ghost" tabIndex={mode === 'login' ? 0 : -1} onClick={() => go('/register')}>
              Đăng ký
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
