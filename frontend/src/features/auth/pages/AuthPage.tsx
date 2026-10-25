import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/logo.png';
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

  const go = (to: '/login' | '/register') => navigate(to, { replace: true });

  return (
    <div className="auth-stage">
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
