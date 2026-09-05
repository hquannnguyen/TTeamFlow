import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { login } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { AuthCard } from '../components/AuthCard';
import { toast, getBackendErrorMessage } from '../../../components/ui/toast.store';

// ── Validation schema ─────────────────────────────────────────────────────────
const schema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .max(72, 'Mật khẩu tối đa 72 ký tự'),
});

type FormValues = z.infer<typeof schema>;

// ── Icons ─────────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
      <line x1="2" x2="22" y1="2" y2="22"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { successMessage?: string; email?: string } | null;
  const { setAuth } = useAuthStore();

  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successBanner, setSuccessBanner] = useState(state?.successMessage ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: state?.email ?? '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setServerError('');
    setSuccessBanner('');
    try {
      const result = await login(values);
      setAuth(result.accessToken, result.user);
      toast.success('Đăng nhập thành công!');
      navigate('/projects', { replace: true });
    } catch (err: unknown) {
      const msg = getBackendErrorMessage(err, 'Email hoặc mật khẩu không chính xác');
      setServerError(msg);
      toast.error(msg);
    }
  }

  return (
    <AuthCard
      heading="Chào mừng trở lại"
      subheading="Đăng nhập để tiếp tục với TTeamFlow"
    >
      <form className="form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* Success banner (e.g. after changing password) */}
        {successBanner && (
          <div className="form-success-banner" role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successBanner}</span>
          </div>
        )}

        {/* Server error banner */}
        {serverError && (
          <div className="form-error-banner" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
            {serverError}
          </div>
        )}

        {/* Email */}
        <div className="form-field">
          <label className="form-label" htmlFor="login-email">Email</label>
          <div className="input-wrapper">
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@company.com"
              className={`form-input${errors.email ? ' error' : ''}`}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <span className="field-error" role="alert">{errors.email.message}</span>
          )}
        </div>

        {/* Password */}
        <div className="form-field">
          <label className="form-label" htmlFor="login-password">Mật khẩu</label>
          <div className="input-wrapper">
            <input
              id="login-password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`form-input has-suffix${errors.password ? ' error' : ''}`}
              {...register('password')}
            />
            <button
              type="button"
              className="input-suffix"
              aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setShowPwd((v) => !v)}
              tabIndex={-1}
            >
              {showPwd ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.password && (
            <span className="field-error" role="alert">{errors.password.message}</span>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          id="login-submit"
        >
          {isSubmitting && <span className="btn-spinner" aria-hidden />}
          {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>

      <p className="auth-footer">
        Chưa có tài khoản?{' '}
        <Link to="/register">Đăng ký ngay</Link>
      </p>
    </AuthCard>
  );
}
