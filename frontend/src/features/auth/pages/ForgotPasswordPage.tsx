import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth.api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email không được để trống');
      return;
    }
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Không thể gửi yêu cầu. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="forgot-password-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div
        className="forgot-password-card"
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
        <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Quên mật khẩu?</h1>
        <p style={{ margin: '0 0 24px', opacity: 0.7, fontSize: 14, lineHeight: 1.6 }}>
          Nhập email đăng ký của bạn, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
        </p>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.6 }}>
              Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.
              Vui lòng kiểm tra hộp thư (kể cả thư mục Spam).
            </p>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 600 }}>
              ← Về trang đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              style={{ width: '100%', marginBottom: 12 }}
            />
            {error && <p style={{ color: '#d64545', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ width: '100%', padding: '10px 0', borderRadius: 8 }}
            >
              {submitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
            </button>
            <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 14 }}>
              <Link to="/login">← Về trang đăng nhập</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
