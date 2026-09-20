import React, { useEffect } from 'react';
import { getMediaUrl } from '../../../api/http';
import type { ProjectMember } from '../api/members.api';

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  member: ProjectMember | null;
  projectName?: string;
  isLoading?: boolean;
}

export function RemoveMemberModal({
  isOpen,
  onClose,
  onConfirm,
  member,
  projectName,
  isLoading = false,
}: RemoveMemberModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !member) return null;

  const avatarUrl = getMediaUrl(member.user?.avatarUrl || member.avatarUrl);
  const displayName = member.user?.fullName || member.fullName || 'Thành viên';
  const displayEmail = member.user?.email || member.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="modal-overlay" onClick={() => !isLoading && onClose()}>
      <div
        className="remove-member-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="remove-member-header">
          <div className="remove-member-warning-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h3 className="remove-member-title">Xóa thành viên khỏi dự án</h3>
            <p className="remove-member-subtitle">
              Thao tác này sẽ loại bỏ quyền truy cập dự án của thành viên.
            </p>
          </div>
        </div>

        <div className="remove-member-body">
          {/* Member Card preview */}
          <div className="remove-member-card-preview">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="remove-member-avatar"
              />
            ) : (
              <div className="remove-member-avatar initials">{initial}</div>
            )}
            <div className="remove-member-info">
              <div className="remove-member-name">{displayName}</div>
              <div className="remove-member-email">{displayEmail}</div>
            </div>
            <span className={`member-role-badge role-${member.role.toLowerCase()}`}>
              {member.role}
            </span>
          </div>

          {/* Warning Banner */}
          <div className="remove-member-alert">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <strong>Lưu ý quan trọng:</strong> Tất cả các nhiệm vụ (tasks) trong dự án{' '}
              {projectName ? <strong>"{projectName}"</strong> : ''} đang được giao cho{' '}
              <strong>{displayName}</strong> sẽ tự động được gỡ gán. Nhiệm vụ sẽ không bị xóa.
            </div>
          </div>
        </div>

        <div className="remove-member-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn-danger-confirm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-ring sm" />
                Đang xóa...
              </>
            ) : (
              'Xác nhận xóa'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
