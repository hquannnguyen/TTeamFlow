import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api/auth.api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Liên kết không hợp lệ hoặc thiếu token.');
      return;
    }
    verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Xác minh email thất bại. Vui lòng thử lại.',
        );
      });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          background: 'var(--surface, #fff)',
          borderRadius: 16,
          padding: 32,
          border: '1px solid var(--border, #e2e8f0)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        }}
      >
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p style={{ fontSize: 15 }}>Đang xác minh email của bạn...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>Xác minh thành công!</h1>
            <p style={{ margin: '0 0 20px', opacity: 0.7, fontSize: 14 }}>{message}</p>
            <Link to="/dashboard" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 8, textDecoration: 'none' }}>
              Vào TTeamFlow
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
            <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>Xác minh thất bại</h1>
            <p style={{ margin: '0 0 20px', opacity: 0.7, fontSize: 14 }}>{message}</p>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 600 }}>
              ← Về trang đăng nhập
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
