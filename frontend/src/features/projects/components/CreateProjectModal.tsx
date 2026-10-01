import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createProject, type Project } from '../api/projects.api';
import { toast } from '../../../components/ui/toast.store';
import { getProjectTheme } from '../utils/project-theme.util';

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Tên dự án phải có ít nhất 2 ký tự')
      .max(120, 'Tên dự án tối đa 120 ký tự'),
    projectKey: z
      .string()
      .trim()
      .min(2, 'Mã dự án phải có từ 2-10 ký tự')
      .max(10, 'Mã dự án tối đa 10 ký tự')
      .regex(
        /^[A-Z0-9]{2,10}$/,
        'Mã dự án chỉ gồm 2-10 ký tự chữ hoa hoặc số (không chứa dấu cách, ký tự đặc biệt)',
      ),
    description: z.string().max(2000, 'Mô tả tối đa 2000 ký tự').optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.dueDate) {
        return new Date(data.dueDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      path: ['dueDate'],
      message: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu',
    },
  );

type FormValues = z.infer<typeof schema>;

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      projectKey: '',
      description: '',
      startDate: '',
      dueDate: '',
    },
  });

  const projectName = watch('name');
  const rawProjectKey = watch('projectKey');
  const previewTheme = getProjectTheme(rawProjectKey || projectName || 'TTF');
  useEffect(() => {
    if (!rawProjectKey && projectName) {
      const suggested = projectName
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0))
        .join('')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5);
      if (suggested.length >= 2) {
        setValue('projectKey', suggested, { shouldValidate: true });
      }
    }
  }, [projectName, rawProjectKey, setValue]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      const newProject = await createProject({
        name: data.name.trim(),
        projectKey: data.projectKey.trim().toUpperCase(),
        description: data.description?.trim() || undefined,
        startDate: data.startDate || undefined,
        dueDate: data.dueDate || undefined,
      });
      toast.success(`Đã tạo dự án "${newProject.name}" thành công`);
      onSuccess(newProject);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
      setServerError(
        typeof msg === 'string' ? msg : 'Không thể tạo dự án. Vui lòng thử lại.',
      );
    }
  }

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
    >
      <div className="modal-dialog" style={{ width: 'min(520px, 100%)', overflow: 'hidden' }}>
        <div style={{ height: 4, width: '100%', background: previewTheme.accentGradient, transition: 'background 0.3s ease' }} />
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="modal-icon-wrap" style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                <line x1="12" y1="10" x2="12" y2="16" />
                <line x1="9" y1="13" x2="15" y2="13" />
              </svg>
            </div>
            <div>
              <h2 id="create-project-title" className="modal-title">Tạo dự án mới</h2>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>
                Khởi tạo không gian làm việc và bảng Kanban cho nhóm
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form className="modal-body" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && (
            <div className="form-error-banner" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

          {/* Project Name */}
          <div className="form-field">
            <label className="form-label" htmlFor="project-name">
              Tên dự án <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              id="project-name"
              type="text"
              placeholder="VD: TTeamFlow Web Application"
              className={`form-input${errors.name ? ' error' : ''}`}
              {...register('name')}
              autoFocus
            />
            {errors.name && (
              <span className="field-error" role="alert">{errors.name.message}</span>
            )}
          </div>

          {/* Project Key */}
          <div className="form-field">
            <label className="form-label" htmlFor="project-key">
              Mã dự án (Key) <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="project-key"
                type="text"
                placeholder="VD: TTF"
                maxLength={10}
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
                className={`form-input${errors.projectKey ? ' error' : ''}`}
                {...register('projectKey', {
                  onChange: (e) => {
                    const upper = (e.target.value as string).toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setValue('projectKey', upper, { shouldValidate: true });
                  },
                })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                Tiền tố đại diện cho mã nhiệm vụ (VD: TTF-1, TTF-2).
              </span>
              {rawProjectKey && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: previewTheme.badgeBg,
                    color: previewTheme.badgeColor,
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: `0 2px 6px ${previewTheme.badgeBg}35`,
                  }}
                  title={`Giao diện nhận diện: ${previewTheme.name}`}
                >
                  {rawProjectKey} • {previewTheme.name}
                </div>
              )}
            </div>
            {errors.projectKey && (
              <span className="field-error" role="alert">{errors.projectKey.message}</span>
            )}
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label" htmlFor="project-desc">Mô tả dự án</label>
            <textarea
              id="project-desc"
              rows={3}
              placeholder="Mô tả mục tiêu, phạm vi hoạt động của dự án..."
              className="form-input"
              style={{ resize: 'vertical', minHeight: 70 }}
              {...register('description')}
            />
            {errors.description && (
              <span className="field-error" role="alert">{errors.description.message}</span>
            )}
          </div>

          {/* Dates row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-field">
              <label className="form-label" htmlFor="project-start-date">Ngày bắt đầu</label>
              <input
                id="project-start-date"
                type="date"
                className="form-input"
                {...register('startDate')}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="project-due-date">Ngày hạn kết thúc</label>
              <input
                id="project-due-date"
                type="date"
                className={`form-input${errors.dueDate ? ' error' : ''}`}
                {...register('dueDate')}
              />
              {errors.dueDate && (
                <span className="field-error" role="alert">{errors.dueDate.message}</span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              id="create-project-submit"
              style={{ width: 'auto', marginTop: 0 }}
            >
              {isSubmitting && <span className="btn-spinner" aria-hidden />}
              {isSubmitting ? 'Đang tạo…' : 'Tạo dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
