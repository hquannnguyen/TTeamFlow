import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminUsers, updateUserStatus } from '../api/admin-users.api';
import { AdminUser } from '../types/admin.types';
import { useAuthStore } from '../../auth/store/auth.store';
import { getMediaUrl } from '../../../api/http';
import { toast } from '../../../components/ui/toast.store';

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentAdmin } = useAuthStore();

  const [page, setPage] = useState(1);
  const limit = 10;
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');

  // Modal confirm state
  const [selectedUserForAction, setSelectedUserForAction] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<'LOCK' | 'UNLOCK'>('LOCK');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Query users
  const activeParam =
    statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE';

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'users', { page, limit, search: debouncedSearch, isActive: activeParam }],
    queryFn: () =>
      getAdminUsers({
        page,
        limit,
        search: debouncedSearch,
        isActive: activeParam,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const users = response?.data || [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Mutation to lock/unlock user
  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateUserStatus(userId, isActive),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setSelectedUserForAction(null);
      if (updatedUser.isActive) {
        toast.success(`Đã mở khóa tài khoản cho "${updatedUser.fullName}"`);
      } else {
        toast.info(`Đã khóa tài khoản của "${updatedUser.fullName}"`);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Thao tác thất bại. Vui lòng thử lại.';
      toast.error(msg);
    },
  });

  function handleOpenConfirmModal(user: AdminUser, type: 'LOCK' | 'UNLOCK') {
    if (user.id === currentAdmin?.id && type === 'LOCK') {
      toast.error('Bạn không thể tự khóa tài khoản của chính mình');
      return;
    }
    setActionType(type);
    setSelectedUserForAction(user);
  }

  function handleConfirmAction() {
    if (!selectedUserForAction) return;
    const newActiveState = actionType === 'UNLOCK';
    updateStatusMutation.mutate({
      userId: selectedUserForAction.id,
      isActive: newActiveState,
    });
  }

  return (
    <div className="admin-page-container">
      {/* ── Header ── */}
      <div className="admin-header-row">
        <div>
          <div className="admin-badge-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            QUẢN TRỊ HỆ THỐNG
          </div>
          <h1 className="admin-page-title">Quản lý người dùng</h1>
          <p className="admin-page-subtitle">
            Xem danh sách tất cả tài khoản trong hệ thống, tìm kiếm và phân quyền hoặc khóa/mở khóa tài khoản.
          </p>
        </div>

        <div className="admin-stats-summary">
          <div className="admin-stat-pill">
            <span className="stat-label">Tổng số tài khoản</span>
            <span className="stat-val">{meta.total}</span>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="admin-controls-card">
        <div className="admin-search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo họ tên hoặc email..."
            className="admin-search-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchInput('')}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        <div className="admin-filter-actions">
          <div className="admin-filter-dropdown">
            <span className="filter-label">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'LOCKED');
                setPage(1);
              }}
              className="admin-select"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã bị khóa</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-admin-refresh"
            onClick={() => refetch()}
            title="Tải lại danh sách"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Table / Content ── */}
      <div className="admin-table-card">
        {isLoading ? (
          <div className="admin-table-loading">
            <div className="spinner-ring" />
            <p>Đang tải danh sách người dùng...</p>
          </div>
        ) : isError ? (
          <div className="admin-table-error">
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
            <h3>Không thể nạp danh sách người dùng</h3>
            <p>{error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi gọi máy chủ.'}</p>
            <button className="btn-retry" onClick={() => refetch()} style={{ marginTop: '12px' }}>
              Thử lại
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-table-empty">
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>👥</div>
            <h3>Không tìm thấy người dùng nào</h3>
            <p>
              {searchInput || statusFilter !== 'ALL'
                ? 'Không có tài khoản nào phù hợp với điều kiện tìm kiếm và bộ lọc của bạn.'
                : 'Hệ thống hiện tại chưa có người dùng nào.'}
            </p>
            {(searchInput || statusFilter !== 'ALL') && (
              <button
                className="btn-retry"
                style={{ marginTop: '12px' }}
                onClick={() => {
                  setSearchInput('');
                  setStatusFilter('ALL');
                  setPage(1);
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="admin-table-responsive">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò hệ thống</th>
                    <th>Trạng thái</th>
                    <th>Ngày tham gia</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isCurrentAdmin = u.id === currentAdmin?.id;
                    const avatar = getMediaUrl(u.avatarUrl);
                    const initials = getInitials(u.fullName);

                    return (
                      <tr key={u.id} className={!u.isActive ? 'row-locked' : ''}>
                        {/* 1. Người dùng */}
                        <td>
                          <div className="user-cell-info">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={u.fullName}
                                className="user-table-avatar"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="user-table-initials">{initials}</div>
                            )}
                            <div className="user-name-group">
                              <div className="user-fullname">
                                {u.fullName}
                                {isCurrentAdmin && (
                                  <span className="current-user-tag">(Bạn)</span>
                                )}
                              </div>
                              <div className="user-email">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Số điện thoại */}
                        <td>
                          <span className="user-phone">{u.phone || '—'}</span>
                        </td>

                        {/* 3. Vai trò hệ thống */}
                        <td>
                          <span
                            className={`badge ${
                              u.systemRole === 'ADMIN' ? 'badge-admin' : 'badge-user'
                            }`}
                          >
                            {u.systemRole === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                          </span>
                        </td>

                        {/* 4. Trạng thái */}
                        <td>
                          {u.isActive ? (
                            <span className="status-pill status-active">
                              <span className="status-dot-green" />
                              Hoạt động
                            </span>
                          ) : (
                            <span className="status-pill status-locked">
                              <span className="status-dot-red" />
                              Đã bị khóa
                            </span>
                          )}
                        </td>

                        {/* 5. Ngày tham gia */}
                        <td>
                          <span className="user-created-date">{formatDate(u.createdAt)}</span>
                        </td>

                        {/* 6. Thao tác */}
                        <td style={{ textAlign: 'right' }}>
                          {isCurrentAdmin ? (
                            <span
                              className="action-disabled-note"
                              title="Bạn không thể tự khóa tài khoản của chính mình"
                            >
                              Không khả dụng
                            </span>
                          ) : u.isActive ? (
                            <button
                              type="button"
                              className="btn-action-lock"
                              onClick={() => handleOpenConfirmModal(u, 'LOCK')}
                              title="Khóa tài khoản này"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              <span>Khóa</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-action-unlock"
                              onClick={() => handleOpenConfirmModal(u, 'UNLOCK')}
                              title="Mở khóa tài khoản này"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                              </svg>
                              <span>Mở khóa</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <div className="admin-pagination-bar">
              <span className="pagination-info">
                Hiển thị trang <strong>{meta.page}</strong> trên tổng số <strong>{meta.totalPages || 1}</strong> trang (Tổng <strong>{meta.total}</strong> người dùng)
              </span>

              <div className="pagination-nav-buttons">
                <button
                  type="button"
                  className="btn-page"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Trang trước
                </button>
                <button
                  type="button"
                  className="btn-page"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Trang sau ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal xác nhận Khóa / Mở khóa ── */}
      {selectedUserForAction && (
        <div className="modal-overlay" onClick={() => setSelectedUserForAction(null)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <div
                className={`confirm-icon-circle ${
                  actionType === 'LOCK' ? 'icon-circle-danger' : 'icon-circle-success'
                }`}
              >
                {actionType === 'LOCK' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </svg>
                )}
              </div>
              <h3 className="confirm-modal-title">
                {actionType === 'LOCK'
                  ? 'Xác nhận khóa tài khoản'
                  : 'Xác nhận mở khóa tài khoản'}
              </h3>
            </div>

            <div className="confirm-modal-body">
              <p>
                Bạn có chắc chắn muốn{' '}
                <strong>{actionType === 'LOCK' ? 'khóa' : 'mở khóa'}</strong> tài khoản của{' '}
                <span style={{ color: '#1e293b', fontWeight: 600 }}>
                  {selectedUserForAction.fullName}
                </span>{' '}
                (<code>{selectedUserForAction.email}</code>)?
              </p>
              {actionType === 'LOCK' ? (
                <div className="confirm-alert-box alert-danger">
                  ⚠️ Sau khi bị khóa, người dùng này sẽ không thể đăng nhập hoặc thực hiện bất kỳ thao tác nào trong hệ thống cho tới khi được Admin mở khóa lại.
                </div>
              ) : (
                <div className="confirm-alert-box alert-info">
                  ℹ️ Sau khi mở khóa, người dùng sẽ có thể đăng nhập và tiếp tục làm việc bình thường.
                </div>
              )}
            </div>

            <div className="confirm-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedUserForAction(null)}
                disabled={updateStatusMutation.isPending}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={actionType === 'LOCK' ? 'btn-danger' : 'btn-primary'}
                onClick={handleConfirmAction}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <span className="spinner-ring" style={{ width: 14, height: 14 }} />
                ) : actionType === 'LOCK' ? (
                  'Đồng ý khóa'
                ) : (
                  'Đồng ý mở khóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

