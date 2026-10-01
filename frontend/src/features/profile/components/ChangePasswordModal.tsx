import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { changePassword } from '../api/profile.api';
import { useAuthStore } from '../../auth/store/auth.store';

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
      .max(72, 'Mật khẩu mới tối đa 72 ký tự')
      .regex(/[A-Z]/, 'Phải chứa ít nhất 1 chữ hoa')
      .regex(/[\d\W]/, 'Phải chứa ít nhất 1 chữ số hoặc ký tự đặc biệt'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

type FormValues = z.infer<typeof schema>;

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[\d]/.test(pw)) score++;
  if (/[\W]/.test(pw) && pw.length >= 10) score++;

  if (score <= 1) return { score: 0, label: 'Yếu' };
  if (score === 2) return { score: 1, label: 'Trung bình' };
  if (score === 3) return { score: 2, label: 'Khá' };
  return { score: 3, label: 'Mạnh' };
}

// ── Eye toggle icon ───────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

// ── Check icon ────────────────────────────────────────────────────────────────
function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-success)', flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-300)', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ChangePasswordModal({ onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPw = watch('newPassword') || '';
  const confirmPw = watch('confirmPassword') || '';
  const strength = getStrength(newPw);

  // Đóng modal khi click backdrop
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(values: FormValues) {
    setServerError('');
    try {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      const userEmail = user?.email;
      onSuccess(result.message || 'Đổi mật khẩu thành công!');
      // Xoá accessToken và user trong store -> buộc đăng nhập lại
      logout();
      onClose();
      navigate('/login', {
        replace: true,
        state: {
          successMessage:
            result.message ||
            'Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.',
          email: userEmail,
        },
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
      setServerError(
        typeof msg === 'string' ? msg : 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      );
    }
  }

  const passwordRequirements = [
    { label: 'Ít nhất 8 ký tự', ok: newPw.length >= 8 },
    { label: 'Có chữ hoa (A–Z)', ok: /[A-Z]/.test(newPw) },
    { label: 'Có chữ số hoặc ký tự đặc biệt', ok: /[\d\W]/.test(newPw) },
  ];

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="cp-modal-title">
      <div className="modal-dialog">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 id="cp-modal-title" className="modal-title">Thay đổi mật khẩu</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form className="modal-body" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Server error */}
          {serverError && (
            <div className="form-error-banner" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              {serverError}
            </div>
          )}

          {/* Current password */}
          <div className="form-field">
            <label className="form-label" htmlFor="cp-current">Mật khẩu hiện tại</label>
            <div className="input-wrapper">
              <input
                id="cp-current"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu hiện tại"
                className={`form-input has-suffix${errors.currentPassword ? ' error' : ''}`}
                {...register('currentPassword')}
              />
              <button type="button" className="input-suffix" tabIndex={-1}
                aria-label={showCurrent ? 'Ẩn' : 'Hiện'}
                onClick={() => setShowCurrent((v) => !v)}>
                {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.currentPassword && (
              <span className="field-error" role="alert">{errors.currentPassword.message}</span>
            )}
          </div>

          {/* New password */}
          <div className="form-field">
            <label className="form-label" htmlFor="cp-new">Mật khẩu mới</label>
            <div className="input-wrapper">
              <input
                id="cp-new"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nhập mật khẩu mới"
                className={`form-input has-suffix${errors.newPassword ? ' error' : ''}`}
                {...register('newPassword')}
              />
              <button type="button" className="input-suffix" tabIndex={-1}
                aria-label={showNew ? 'Ẩn' : 'Hiện'}
                onClick={() => setShowNew((v) => !v)}>
                {showNew ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.newPassword && (
              <span className="field-error" role="alert">{errors.newPassword.message}</span>
            )}

            {/* Strength meter */}
            {newPw.length > 0 && (
              <div className="strength-meter" style={{ marginTop: 4 }}>
                <div className="strength-bars">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`strength-bar${i <= strength.score ? ` active-${strength.score}` : ''}`}
                    />
                  ))}
                </div>
                <span className={`strength-label s${strength.score}`}>{strength.label}</span>
              </div>
            )}

            {/* Requirements checklist */}
            <div className="password-req-list">
              {passwordRequirements.map((req) => (
                <div key={req.label} className="password-req">
                  <CheckIcon ok={req.ok} />
                  <span style={{ color: req.ok ? 'var(--color-success)' : 'var(--gray-400)' }}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm password */}
          <div className="form-field">
            <label className="form-label" htmlFor="cp-confirm">Xác nhận mật khẩu mới</label>
            <div className="input-wrapper">
              <input
                id="cp-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                className={`form-input has-suffix${errors.confirmPassword ? ' error' : ''}`}
                {...register('confirmPassword')}
              />
              <button type="button" className="input-suffix" tabIndex={-1}
                aria-label={showConfirm ? 'Ẩn' : 'Hiện'}
                onClick={() => setShowConfirm((v) => !v)}>
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {/* Match indicator */}
            {confirmPw.length > 0 && !errors.confirmPassword && (
              <span style={{ fontSize: 12, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckIcon ok={true} /> Mật khẩu khớp
              </span>
            )}
            {errors.confirmPassword && (
              <span className="field-error" role="alert">{errors.confirmPassword.message}</span>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              id="cp-submit"
              style={{ width: 'auto', marginTop: 0 }}
            >
              {isSubmitting && <span className="btn-spinner" aria-hidden />}
              {isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
