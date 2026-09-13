import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateProject, type Project } from '../api/projects.api';
import { toast } from '../../../components/ui/toast.store';

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Tên dự án phải có ít nhất 2 ký tự')
      .max(120, 'Tên dự án tối đa 120 ký tự'),
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

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: (updated: Project) => void;
}

function formatDateForInput(dateStr?: string | null): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

export function EditProjectModal({ project, onClose, onSuccess }: EditProjectModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project.name,
      description: project.description || '',
      startDate: formatDateForInput(project.startDate),
      dueDate: formatDateForInput(project.dueDate),
    },
  });

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
      const updated = await updateProject(project.id, {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        startDate: data.startDate || null,
        dueDate: data.dueDate || null,
      });
      toast.success(`Đã cập nhật dự án "${updated.name}"`);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
      setServerError(
        typeof msg === 'string' ? msg : 'Không thể cập nhật dự án. Vui lòng thử lại.',
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
      aria-labelledby="edit-project-title"
    >
      <div className="modal-dialog" style={{ width: 'min(520px, 100%)' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="modal-icon-wrap" style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </div>
            <div>
              <h2 id="edit-project-title" className="modal-title">Chỉnh sửa dự án</h2>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>
                Mã định danh: <strong>{project.projectKey}</strong>
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
            <label className="form-label" htmlFor="edit-project-name">
              Tên dự án <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              id="edit-project-name"
              type="text"
              className={`form-input${errors.name ? ' error' : ''}`}
              {...register('name')}
              autoFocus
            />
            {errors.name && (
              <span className="field-error" role="alert">{errors.name.message}</span>
            )}
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label" htmlFor="edit-project-desc">Mô tả dự án</label>
            <textarea
              id="edit-project-desc"
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
              <label className="form-label" htmlFor="edit-project-start-date">Ngày bắt đầu</label>
              <input
                id="edit-project-start-date"
                type="date"
                className="form-input"
                {...register('startDate')}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="edit-project-due-date">Ngày hạn kết thúc</label>
              <input
                id="edit-project-due-date"
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
              id="edit-project-submit"
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
