import type { CSSProperties } from 'react';

interface SkeletonProps {
  w?: number | string;
  h?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** Khối placeholder có hiệu ứng shimmer. Kích thước truyền qua props. */
export function Skeleton({ w = '100%', h = 14, radius = 6, className = '', style }: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width: w, height: h, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

function SkeletonRegion({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}

/** Dashboard: tiêu đề + 4 thẻ số liệu + 2 khối biểu đồ */
export function DashboardSkeleton() {
  return (
    <SkeletonRegion label="Đang tải tổng quan" className="dashboard-page-container">
      <div className="sk-row sk-between">
        <div className="sk-col">
          <Skeleton w={240} h={28} />
          <Skeleton w={380} h={14} />
        </div>
        <Skeleton w={180} h={38} radius={10} />
      </div>
      <div className="metrics-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sk-card sk-col">
            <Skeleton w="45%" h={13} />
            <Skeleton w={72} h={34} />
            <Skeleton w="60%" h={12} />
          </div>
        ))}
      </div>
      <div className="sk-grid-2">
        <div className="sk-card sk-col" style={{ minHeight: 260 }}>
          <Skeleton w="35%" h={16} />
          <Skeleton w={150} h={150} radius="50%" style={{ margin: '12px auto' }} />
        </div>
        <div className="sk-card sk-col" style={{ minHeight: 260 }}>
          <Skeleton w="40%" h={16} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="sk-row">
              <Skeleton w={28} h={28} radius="50%" />
              <Skeleton w="100%" h={10} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Bảng Kanban: thanh tiêu đề + 3 cột với vài thẻ task */
export function KanbanSkeleton() {
  return (
    <SkeletonRegion label="Đang tải bảng Kanban" className="kanban-page-container">
      <div className="sk-card sk-col" style={{ marginBottom: 16 }}>
        <div className="sk-row sk-between">
          <Skeleton w={260} h={26} />
          <Skeleton w={120} h={34} radius={8} />
        </div>
        <div className="sk-row">
          <Skeleton w={130} h={32} radius={16} />
          <Skeleton w={130} h={32} radius={16} />
          <Skeleton w={90} h={32} radius={16} />
        </div>
      </div>
      <div className="sk-board">
        {[3, 2, 1].map((cards, c) => (
          <div key={c} className="sk-column sk-col">
            <Skeleton w="40%" h={16} />
            {Array.from({ length: cards }).map((_, i) => (
              <div key={i} className="sk-task sk-col">
                <Skeleton w="85%" h={13} />
                <Skeleton w="55%" h={11} />
                <div className="sk-row sk-between">
                  <Skeleton w={54} h={18} radius={9} />
                  <Skeleton w={24} h={24} radius="50%" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

/** Trang dạng bảng (thành viên, nhật ký, người dùng) */
export function TableSkeleton({ rows = 5, className = '', label = 'Đang tải danh sách' }: { rows?: number; className?: string; label?: string }) {
  return (
    <SkeletonRegion label={label} className={className}>
      <div className="sk-card sk-col" style={{ marginBottom: 16 }}>
        <Skeleton w={220} h={26} />
        <Skeleton w={340} h={13} />
      </div>
      <div className="sk-card sk-col">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="sk-row sk-table-row">
            <Skeleton w={36} h={36} radius="50%" />
            <div className="sk-col" style={{ flex: 1 }}>
              <Skeleton w="30%" h={13} />
              <Skeleton w="20%" h={11} />
            </div>
            <Skeleton w={90} h={22} radius={11} />
            <Skeleton w={70} h={13} />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

/** Chi tiết task: tiêu đề + nội dung + cột bên */
export function TaskDetailSkeleton() {
  return (
    <SkeletonRegion label="Đang tải chi tiết công việc" className="task-detail-page-wrapper">
      <div className="sk-card sk-col">
        <Skeleton w="55%" h={28} />
        <div className="sk-row">
          <Skeleton w={80} h={22} radius={11} />
          <Skeleton w={100} h={22} radius={11} />
        </div>
        <Skeleton h={90} radius={10} />
        <Skeleton w="70%" h={13} />
        <Skeleton w="50%" h={13} />
      </div>
    </SkeletonRegion>
  );
}
