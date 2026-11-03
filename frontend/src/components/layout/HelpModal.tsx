import { useEffect } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

const ROLES = [
  { name: 'Chủ sở hữu (Owner)', desc: 'Toàn quyền với dự án: sửa, lưu trữ, xóa, quản lý thành viên.' },
  { name: 'Quản lý (Manager)', desc: 'Quản lý cột, task và thành viên (trừ xóa dự án).' },
  { name: 'Thành viên (Member)', desc: 'Tạo, cập nhật, di chuyển task và bình luận.' },
  { name: 'Chỉ xem (Viewer)', desc: 'Chỉ xem bảng Kanban, task và dashboard.' },
];

const TIPS = [
  'Kéo thả thẻ task giữa các cột trên Bảng Kanban để đổi trạng thái.',
  'Dùng bộ lọc người thực hiện, độ ưu tiên và hạn chót để thu hẹp danh sách task.',
  'Bấm chuông để xem thông báo; bấm vào thông báo để mở thẳng task liên quan.',
  'Dashboard có nút "Xuất báo cáo" để tải số liệu dự án dạng CSV.',
];

export function HelpModal({ onClose }: HelpModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" style={{ width: 'min(520px, 100%)' }}>
        <div className="modal-header">
          <h2 id="help-modal-title" className="modal-title">Trợ giúp nhanh</h2>
          <button className="modal-close" onClick={onClose} aria-label="Đóng" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 24px 20px', display: 'grid', gap: 18 }}>
          <section>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Vai trò trong dự án</h3>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
              {ROLES.map((r) => (
                <li key={r.name}>
                  <strong>{r.name}:</strong> <span style={{ color: 'var(--gray-500)' }}>{r.desc}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Mẹo sử dụng</h3>
            <ul style={{ paddingLeft: 18, display: 'grid', gap: 6, fontSize: 13.5, lineHeight: 1.5, color: 'var(--gray-700)' }}>
              {TIPS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
