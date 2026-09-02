import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { register as registerUser } from '../api/auth.api';
import { AuthCard } from '../components/AuthCard';

// ── Password policy (mirrors backend RegisterDto exactly) ─────────────────────
const passwordPolicy = z
  .string()
  .min(8, 'Tối thiểu 8 ký tự')
  .max(72, 'Tối đa 72 ký tự')
  .regex(/[a-z]/, 'Phải có ít nhất 1 chữ thường')
  .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
  .regex(/\d/, 'Phải có ít nhất 1 chữ số')
  .regex(/[^A-Za-z0-9]/, 'Phải có ít nhất 1 ký tự đặc biệt');

const schema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Họ tên tối thiểu 2 ký tự')
      .max(100, 'Họ tên tối đa 100 ký tự'),
    email: z
      .string()
      .min(1, 'Email không được để trống')
      .email('Email không hợp lệ'),
    password: passwordPolicy,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

// ── Password strength calculation ─────────────────────────────────────────────
function calcStrength(pwd: string): number {
  if (!pwd) return -1;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score - 1; // 0-3
}

const STRENGTH_LABELS = ['Quá yếu', 'Trung bình', 'Khá tốt', 'Mạnh'];

// ── Eye icon ──────────────────────────────────────────────────────────────────
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
export function RegisterPage() {
  const navigate = useNavigate();

  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');
  const strength = calcStrength(passwordValue ?? '');

  async function onSubmit(values: FormValues) {
    setServerError('');
    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });
      navigate('/login', {
        replace: true,
        state: { registered: true },
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setServerError(
        typeof msg === 'string' ? msg : 'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
    }
  }

  return (
    <AuthCard
      heading="Tạo tài khoản"
      subheading="Tham gia TTeamFlow để quản lý dự án hiệu quả"
    >
      <form className="form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* Server error */}
        {serverError && (
          <div className="form-error-banner" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
            {serverError}
          </div>
        )}

        {/* Full name */}
        <div className="form-field">
          <label className="form-label" htmlFor="reg-name">Họ và tên</label>
          <div className="input-wrapper">
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Nguyễn Văn A"
              className={`form-input${errors.fullName ? ' error' : ''}`}
              {...register('fullName')}
            />
          </div>
          {errors.fullName && (
            <span className="field-error" role="alert">{errors.fullName.message}</span>
          )}
        </div>

        {/* Email */}
        <div className="form-field">
          <label className="form-label" htmlFor="reg-email">Email</label>
          <div className="input-wrapper">
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
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
          <label className="form-label" htmlFor="reg-password">Mật khẩu</label>
          <div className="input-wrapper">
            <input
              id="reg-password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
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

          {/* Error first — immediately below input */}
          {errors.password && (
            <span className="field-error" role="alert">{errors.password.message}</span>
          )}

          {/* Strength meter — below error */}
          {passwordValue && strength >= 0 && (
            <div className="strength-meter">
              <div className="strength-bars">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`strength-bar${i <= strength ? ` active-${strength}` : ''}`}
                  />
                ))}
              </div>
              <span className={`strength-label s${strength}`}>
                {STRENGTH_LABELS[strength]}
              </span>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="form-field">
          <label className="form-label" htmlFor="reg-confirm">Xác nhận mật khẩu</label>
          <div className="input-wrapper">
            <input
              id="reg-confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              className={`form-input has-suffix${errors.confirmPassword ? ' error' : ''}`}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              className="input-suffix"
              aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setShowConfirm((v) => !v)}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="field-error" role="alert">{errors.confirmPassword.message}</span>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          id="register-submit"
        >
          {isSubmitting && <span className="btn-spinner" aria-hidden />}
          {isSubmitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="auth-footer">
        Đã có tài khoản?{' '}
        <Link to="/login">Đăng nhập</Link>
      </p>
    </AuthCard>
  );
}
