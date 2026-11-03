import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth.api';

function validatePassword(pwd: string): string {
  if (pwd.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
  if (!/[A-Z]/.test(pwd)) return 'Mật khẩu phải có ít nhất 1 chữ hoa';
  if (!/[a-z]/.test(pwd)) return 'Mật khẩu phải có ít nhất 1 chữ thường';
  if (!/[0-9]/.test(pwd)) return 'Mật khẩu phải có ít nhất 1 chữ số';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt';
  return '';
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const tokenMissing = !token;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    if (password !== confirm) {
      setError('Xác nhận mật khẩu không khớp');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--surface, #fff)',
          borderRadius: 16,
          padding: 32,
          border: '1px solid var(--border, #e2e8f0)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Đặt lại mật khẩu</h1>

        {tokenMissing ? (
          <>
            <p style={{ margin: '0 0 16px', opacity: 0.7, fontSize: 14 }}>
              Liên kết không hợp lệ hoặc thiếu token.
            </p>
            <Link to="/forgot-password" style={{ fontSize: 14, fontWeight: 600 }}>
              Yêu cầu liên kết mới →
            </Link>
          </>
        ) : done ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ margin: '0 0 16px', fontSize: 14 }}>
              Đặt lại mật khẩu thành công! Đang chuyển tới trang đăng nhập...
            </p>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 600 }}>
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Mật khẩu mới
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Tối thiểu 8 ký tự, có chữ hoa, chữ số, ký tự đặc biệt"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{ width: '100%', marginBottom: 12 }}
            />
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              className="form-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
            {error && <p style={{ color: '#d64545', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ width: '100%', padding: '10px 0', borderRadius: 8 }}
            >
              {submitting ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
