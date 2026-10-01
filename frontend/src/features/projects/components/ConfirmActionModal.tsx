import { useEffect, useRef, useState } from 'react';

interface ConfirmActionModalProps {
  title: string;
  message: string;
  confirmText: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmActionModal({
  title,
  message,
  confirmText,
  confirmVariant = 'warning',
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
      setError(typeof msg === 'string' ? msg : 'Thao tác không thành công. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const iconBg =
    confirmVariant === 'danger'
      ? 'var(--color-error-bg)'
      : confirmVariant === 'warning'
        ? '#FFFBEB'
        : 'var(--brand-50)';

  const iconColor =
    confirmVariant === 'danger'
      ? 'var(--color-error)'
      : confirmVariant === 'warning'
        ? '#D97706'
        : 'var(--brand-500)';

  const btnBg =
    confirmVariant === 'danger'
      ? 'var(--color-error)'
      : confirmVariant === 'warning'
        ? '#D97706'
        : 'var(--brand-500)';

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="modal-dialog" style={{ width: 'min(440px, 100%)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="modal-icon-wrap" style={{ background: iconBg, color: iconColor }}>
              {confirmVariant === 'danger' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <h2 id="confirm-modal-title" className="modal-title">{title}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {error && (
            <div className="form-error-banner" role="alert">
              <span>{error}</span>
            </div>
          )}
          <p style={{ color: 'var(--color-text)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            {message}
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </button>
          <button
            type="button"
            className="btn"
            style={{
              background: btnBg,
              color: '#FFFFFF',
              border: 'none',
              width: 'auto',
              marginTop: 0,
            }}
            disabled={isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting && <span className="btn-spinner" aria-hidden />}
            {isSubmitting ? 'Đang xử lý…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
