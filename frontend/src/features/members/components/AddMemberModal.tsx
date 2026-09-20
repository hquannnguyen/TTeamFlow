import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getMediaUrl } from '../../../api/http';
import { toast } from '../../../components/ui/toast.store';
import {
  addProjectMember,
  searchCandidateUsers,
  type CandidateUser,
  type ProjectMember,
} from '../api/members.api';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  onMemberAdded?: (member: ProjectMember) => void;
}

type AllowedRole = 'MANAGER' | 'MEMBER' | 'VIEWER';

const ROLE_OPTIONS: Array<{
  role: AllowedRole;
  label: string;
  badgeClass: string;
  desc: string;
}> = [
  {
    role: 'MEMBER',
    label: 'Thành viên (Member)',
    badgeClass: 'role-badge-member',
    desc: 'Tạo, cập nhật và thực hiện nhiệm vụ trên bảng Kanban',
  },
  {
    role: 'MANAGER',
    label: 'Quản lý (Manager)',
    badgeClass: 'role-badge-manager',
    desc: 'Toàn quyền cấu hình cột, mời thành viên và quản lý công việc',
  },
  {
    role: 'VIEWER',
    label: 'Người xem (Viewer)',
    badgeClass: 'role-badge-viewer',
    desc: 'Chỉ xem bảng Kanban và tiến độ công việc, không được chỉnh sửa',
  },
];

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function AddMemberModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  onMemberAdded,
}: AddMemberModalProps) {
  const [query, setQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateUser | null>(null);
  const [role, setRole] = useState<AllowedRole>('MEMBER');
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedCandidate(null);
      setRole('MEMBER');
      setCandidates([]);
      setErrorMsg(null);
      setIsDropdownOpen(false);
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search khi gõ query
  useEffect(() => {
    if (!isOpen || selectedCandidate) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setCandidates([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setErrorMsg(null);
      try {
        const results = await searchCandidateUsers(trimmed, projectId);
        setCandidates(results);
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Lỗi tìm kiếm người dùng:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, isOpen, projectId, selectedCandidate]);

  // Handle select candidate from autocomplete
  const handleSelectCandidate = (candidate: CandidateUser) => {
    if (candidate.isMember) {
      toast.info('Người dùng này đã là thành viên của dự án');
      return;
    }
    setSelectedCandidate(candidate);
    setQuery(candidate.email);
    setIsDropdownOpen(false);
    setErrorMsg(null);
  };

  const handleClearSelected = () => {
    setSelectedCandidate(null);
    setQuery('');
    setCandidates([]);
    setIsDropdownOpen(false);
    setErrorMsg(null);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (selectedCandidate ? selectedCandidate.email : query).trim().toLowerCase();

    if (!targetEmail) {
      setErrorMsg('Vui lòng nhập email hoặc chọn người dùng cần mời');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setErrorMsg('Địa chỉ email không đúng định dạng');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newMember = await addProjectMember(projectId, {
        email: targetEmail,
        role,
      });

      toast.success(`Đã thêm thành viên "${newMember.fullName || targetEmail}" vào dự án`);
      onMemberAdded?.(newMember);
      onClose();
    } catch (err: unknown) {
      const res =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
          : undefined;
      const msg = res?.message || 'Không thể thêm thành viên vào dự án';
      const cleanMsg = Array.isArray(msg) ? msg.join(', ') : msg;
      setErrorMsg(cleanMsg);
      toast.error(cleanMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container add-member-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Mời thành viên vào dự án</h3>
            {projectName && (
              <p className="modal-subtitle">
                Dự án: <strong style={{ color: '#38bdf8' }}>{projectName}</strong>
              </p>
            )}
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-member-form">
          <div className="modal-body">
            {errorMsg && (
              <div className="add-member-error-banner">
                <span className="error-icon">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Field: Search / Email */}
            <div className="form-group" ref={containerRef}>
              <label className="form-label">
                Tìm kiếm người dùng <span className="required-mark">*</span>
              </label>
              <p className="form-helper-text">
                Nhập họ tên hoặc địa chỉ email của đồng đội để nhận gợi ý
              </p>

              {selectedCandidate ? (
                /* Selected Card */
                <div className="selected-candidate-card">
                  <div className="candidate-avatar-wrap">
                    {getMediaUrl(selectedCandidate.avatarUrl) ? (
                      <img
                        src={getMediaUrl(selectedCandidate.avatarUrl)!}
                        alt={selectedCandidate.fullName}
                        className="candidate-avatar-img"
                      />
                    ) : (
                      <div className="candidate-avatar-initials">
                        {getInitials(selectedCandidate.fullName)}
                      </div>
                    )}
                  </div>
                  <div className="candidate-card-info">
                    <div className="candidate-card-name">{selectedCandidate.fullName}</div>
                    <div className="candidate-card-email">{selectedCandidate.email}</div>
                  </div>
                  <button
                    type="button"
                    className="candidate-card-remove-btn"
                    onClick={handleClearSelected}
                    title="Đổi người khác"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                /* Search Input Box */
                <div className="candidate-search-input-wrap">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="form-input candidate-search-input"
                    placeholder="Ví dụ: nguyen@example.com hoặc Nguyễn Văn A..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIsDropdownOpen(true);
                      setErrorMsg(null);
                    }}
                    onFocus={() => {
                      if (candidates.length > 0) setIsDropdownOpen(true);
                    }}
                  />
                  {isSearching && (
                    <div className="candidate-search-spinner" title="Đang tìm...">
                      <div className="spinner-ring-small" />
                    </div>
                  )}

                  {/* Suggestion Dropdown */}
                  {isDropdownOpen && query.trim().length > 0 && (
                    <div className="candidate-dropdown-menu">
                      {isSearching ? (
                        <div className="candidate-dropdown-loading">Đang tìm kiếm tài khoản...</div>
                      ) : candidates.length === 0 ? (
                        <div className="candidate-dropdown-empty">
                          Không tìm thấy người dùng phù hợp. Bạn vẫn có thể nhập trực tiếp email để mời.
                        </div>
                      ) : (
                        candidates.map((c) => {
                          const avatar = getMediaUrl(c.avatarUrl);
                          return (
                            <div
                              key={c.id}
                              className={`candidate-dropdown-item ${c.isMember ? 'is-already-member' : ''}`}
                              onClick={() => handleSelectCandidate(c)}
                            >
                              <div className="candidate-item-avatar">
                                {avatar ? (
                                  <img src={avatar} alt={c.fullName} />
                                ) : (
                                  <div>{getInitials(c.fullName)}</div>
                                )}
                              </div>
                              <div className="candidate-item-details">
                                <span className="candidate-item-name">{c.fullName}</span>
                                <span className="candidate-item-email">{c.email}</span>
                              </div>
                              {c.isMember ? (
                                <span className="candidate-badge-joined">Đã ở trong dự án</span>
                              ) : (
                                <span className="candidate-action-tag">+ Chọn</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Field: Role Selection */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">
                Vai trò trong dự án <span className="required-mark">*</span>
              </label>

              <div className="role-cards-grid">
                {ROLE_OPTIONS.map((opt) => {
                  const isSelected = role === opt.role;
                  return (
                    <div
                      key={opt.role}
                      className={`role-option-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setRole(opt.role)}
                    >
                      <div className="role-option-header">
                        <span className={`role-badge ${opt.badgeClass}`}>{opt.label}</span>
                        <input
                          type="radio"
                          name="projectRole"
                          checked={isSelected}
                          onChange={() => setRole(opt.role)}
                          className="role-radio"
                        />
                      </div>
                      <p className="role-option-desc">{opt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || (!selectedCandidate && !query.trim())}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner-ring-small" style={{ marginRight: '8px' }} />
                  Đang thêm...
                </>
              ) : (
                'Thêm vào dự án'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
