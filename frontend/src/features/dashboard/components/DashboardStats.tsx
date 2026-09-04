import { DashboardMetrics } from '../types/dashboard.types';

interface DashboardStatsProps {
  metrics: DashboardMetrics;
}

export function DashboardStats({ metrics }: DashboardStatsProps) {
  const total = metrics.totalTasks ?? 240;
  const progress = metrics.progress ?? 68;
  const target = metrics.targetProgress ?? 80;
  const active = metrics.activeTasks ?? 45;
  const overdue = metrics.overdueTasks ?? 3;
  const growth = metrics.growthRate ?? 12;

  // Calculate SVG circle stroke properties for the gauge
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="metrics-grid">
      {/* 1. Tổng số nhiệm vụ */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-title">Tổng số nhiệm vụ</span>
          <span className="metric-badge-growth">~ {growth}%</span>
        </div>
        <div className="metric-card-body">
          <div className="metric-main-value">{total}</div>
          <div className="metric-subtext">Trên tất cả dự án</div>
        </div>
        {/* Soft wave sparkline in bottom right */}
        <div className="metric-sparkline-wrap">
          <svg width="80" height="36" viewBox="0 0 80 36" fill="none">
            <path
              d="M0 26C15 26 22 18 36 22C48 25 58 10 80 8V36H0V26Z"
              fill="rgba(99, 102, 241, 0.12)"
            />
            <path
              d="M0 26C15 26 22 18 36 22C48 25 58 10 80 8"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 2. Hoàn thành dự án */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-title">Hoàn thành dự án</span>
          <svg className="metric-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </div>
        <div className="metric-card-gauge-row">
          <div className="circular-gauge">
            <svg width="68" height="68" viewBox="0 0 68 68">
              <circle
                cx="34"
                cy="34"
                r={radius}
                className="gauge-track"
                strokeWidth="6"
              />
              <circle
                cx="34"
                cy="34"
                r={radius}
                className="gauge-progress"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 34 34)"
              />
            </svg>
            <span className="gauge-text">{progress}%</span>
          </div>
          <div className="gauge-meta">
            <div className="gauge-target">Mục tiêu: {target}%</div>
            <div className="gauge-status">
              <span>↑</span> Đúng tiến độ
            </div>
          </div>
        </div>
      </div>

      {/* 3. Khối lượng công việc đang xử lý */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-title">Khối lượng công việc đang xử lý</span>
          <svg className="metric-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4" />
            <path d="M12 16h4" />
            <path d="M8 11h.01" />
            <path d="M8 16h.01" />
          </svg>
        </div>
        <div className="metric-card-body">
          <div className="metric-main-value">{active}</div>
          <div className="metric-subtext">Nhiệm vụ đang hoạt động</div>
        </div>
        <div className="metric-mini-bars">
          <span style={{ height: '14px', background: '#e0e7ff' }}></span>
          <span style={{ height: '22px', background: '#c7d2fe' }}></span>
          <span style={{ height: '18px', background: '#818cf8' }}></span>
          <span style={{ height: '28px', background: '#4f46e5' }}></span>
        </div>
      </div>

      {/* 4. Nhiệm vụ quá hạn */}
      <div className="metric-card metric-card-warning">
        <div className="metric-card-header">
          <span className="metric-title text-warning">Nhiệm vụ quá hạn</span>
          <svg className="metric-icon-warning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="metric-card-body">
          <div className="metric-main-value text-danger">{overdue}</div>
          <div className="overdue-action-row">
            <span className="overdue-label">Cần xử lý</span>
            <button className="overdue-action-btn" type="button">
              Xem danh sách
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}