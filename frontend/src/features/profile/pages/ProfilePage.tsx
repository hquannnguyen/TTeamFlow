import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getProfile, updateProfile, updateAvatar } from '../api/profile.api';
import type { UserProfile } from '../api/profile.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { getMediaUrl } from '../../../api/http';

// ── Validation schema ─────────────────────────────────────────────────────────
const schema = z.object({
  fullName: z
    .string()
    .min(1, 'Họ và tên không được để trống')
    .max(100, 'Họ và tên tối đa 100 ký tự')
    .transform((v) => v.trim()),
  phone: z
    .string()
    .transform((v) => v.trim().replace(/[\s.-]/g, ''))
    .refine(
      (v) => v === '' || /^(0[2-9]\d{8,9}|\+[1-9]\d{7,14})$/.test(v),
      {
        message:
          'Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678 theo chuẩn E.164)',
      },
    )
    .optional()
    .or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

// ── Initials helper ───────────────────────────────────────────────────────────
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ── Camera icon ───────────────────────────────────────────────────────────────
function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

// ── Toast component ───────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`toast toast-${type}`} role="alert" aria-live="polite">
      {type === 'success' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      )}
      <span>{message}</span>
      <button className="toast-close" onClick={onDismiss} aria-label="Đóng thông báo">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { user: authUser, setAuth, accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    getProfile()
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Không thể tải thông tin cá nhân. Vui lòng thử lại.');
        setLoading(false);
      });
  }, []);

  // ── Form ──────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', phone: '' },
  });

  useEffect(() => {
    if (profile) {
      reset({ fullName: profile.fullName, phone: profile.phone ?? '' });
    }
  }, [profile, reset]);

  async function onSaveProfile(values: FormValues) {
    try {
      const updated = await updateProfile({
        fullName: values.fullName,
        phone: values.phone || undefined,
      });
      setProfile(updated);
      // Sync auth store user name
      if (authUser && accessToken) {
        setAuth(accessToken, { ...authUser, fullName: updated.fullName });
      }
      reset({ fullName: updated.fullName, phone: updated.phone ?? '' });
      setToast({ message: 'Cập nhật thông tin thành công!', type: 'success' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setToast({
        message: typeof msg === 'string' ? msg : 'Cập nhật thất bại. Vui lòng thử lại.',
        type: 'error',
      });
    }
  }

  // ── Avatar upload ─────────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const updated = await updateAvatar(file);
      setProfile(updated);
      if (authUser && accessToken) {
        setAuth(accessToken, { ...authUser, avatarUrl: updated.avatarUrl });
      }
      setToast({ message: 'Cập nhật ảnh đại diện thành công!', type: 'success' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setToast({
        message: typeof msg === 'string' ? msg : 'Tải ảnh thất bại. Vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      setAvatarUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const displayName = profile?.fullName ?? authUser?.fullName ?? '';
  const initials = displayName ? getInitials(displayName) : '?';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <span className="spinner-ring" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="form-error-banner" style={{ maxWidth: 480, margin: '40px auto' }} role="alert">
        {loadError}
      </div>
    );
  }

  const roleLabel = profile?.systemRole === 'ADMIN' ? 'Admin' : 'Thành viên';
  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <>
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* Page */}
      <div>
        <div className="page-heading">
          <h1 className="page-title">Hồ sơ cá nhân</h1>
        </div>

        <div className="profile-layout">
          {/* ── Left: Avatar card ─────────────────────────────────────── */}
          <div className="profile-card profile-avatar-card">
            <div className="avatar-upload-ring" onClick={() => fileInputRef.current?.click()}>
              {getMediaUrl(profile?.avatarUrl) ? (
                <img
                  src={getMediaUrl(profile?.avatarUrl)!}
                  alt={displayName}
                  className="avatar-img"
                />
              ) : (
                <div className="avatar-initials">{initials}</div>
              )}
              <div className="avatar-overlay" aria-hidden>
                {avatarUploading ? (
                  <span className="btn-spinner" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: 'white' }} />
                ) : (
                  <CameraIcon />
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
              id="avatar-file-input"
            />

            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 12, fontSize: 13 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              type="button"
            >
              {avatarUploading ? 'Đang tải lên…' : 'Đổi ảnh đại diện'}
            </button>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <div className="profile-name">{displayName}</div>
              <div className="profile-email">{profile?.email}</div>
              <span className={`badge badge-${profile?.systemRole === 'ADMIN' ? 'admin' : 'user'}`}>
                {roleLabel}
              </span>
              {joinedDate && (
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 12 }}>
                  Tham gia từ {joinedDate}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Info + Security ────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Personal info card */}
            <div className="profile-card">
              <h2 className="profile-section-title">Thông tin cá nhân</h2>
              <p className="profile-section-sub">Cập nhật họ tên và số điện thoại của bạn.</p>

              <form className="form-stack" onSubmit={handleSubmit(onSaveProfile)} noValidate style={{ marginTop: 20 }}>
                {/* Full name */}
                <div className="form-field">
                  <label className="form-label" htmlFor="profile-fullname">Họ và tên</label>
                  <input
                    id="profile-fullname"
                    type="text"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    className={`form-input${errors.fullName ? ' error' : ''}`}
                    {...register('fullName')}
                  />
                  {errors.fullName && (
                    <span className="field-error" role="alert">{errors.fullName.message}</span>
                  )}
                </div>

                {/* Email (readonly) */}
                <div className="form-field">
                  <label className="form-label" htmlFor="profile-email">
                    Email
                    <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--gray-400)', fontWeight: 400 }}>
                      (không thể thay đổi)
                    </span>
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={profile?.email ?? ''}
                    readOnly
                    className="form-input"
                    style={{ background: 'var(--gray-50)', cursor: 'default', color: 'var(--gray-500)' }}
                  />
                </div>

                {/* Phone */}
                <div className="form-field">
                  <label className="form-label" htmlFor="profile-phone">Số điện thoại</label>
                  <input
                    id="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="0912345678 hoặc +84912345678 (tùy chọn)"
                    className={`form-input${errors.phone ? ' error' : ''}`}
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <span className="field-error" role="alert">{errors.phone.message}</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || !isDirty}
                    id="profile-save-btn"
                    style={{ width: 'auto', marginTop: 0, minWidth: 130 }}
                  >
                    {isSubmitting && <span className="btn-spinner" aria-hidden />}
                    {isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
