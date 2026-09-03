import { DashboardMetrics } from '../types/dashboard.types';

interface DashboardChartsProps {
  metrics: DashboardMetrics;
}

export function DashboardCharts({ metrics }: DashboardChartsProps) {
  const total = metrics.totalTasks || 240;

  // Donut chart calculations
  const radius = 62;
  const circumference = 2 * Math.PI * radius;

  // Prepare segments for donut
  // Fallbacks in case statusDistribution is empty or basic
  const dist = metrics.statusDistribution.length > 0
    ? metrics.statusDistribution
    : [
        { columnId: '1', columnName: 'Cần làm', isCompleted: false, count: 72, percentage: 30, color: '#94a3b8' },
        { columnId: '2', columnName: 'Đang làm', isCompleted: false, count: 48, percentage: 20, color: '#d97706' },
        { columnId: '3', columnName: 'Hoàn thành', isCompleted: true, count: 120, percentage: 50, color: '#10b981' },
      ];

  let cumulativePercent = 0;
  const donutSegments = dist.map((item) => {
    const pct = item.percentage ?? Math.round((item.count / total) * 100);
    const strokeDash = (pct / 100) * circumference;
    const strokeOffset = - (cumulativePercent / 100) * circumference;
    cumulativePercent += pct;

    let color = item.color;
    if (!color) {
      if (item.isCompleted) color = '#10b981';
      else if (item.columnName.toLowerCase().includes('đang') || item.columnName.toLowerCase().includes('progress')) color = '#d97706';
      else color = '#94a3b8';
    }

    return {
      ...item,
      pct,
      color,
      strokeDash,
      strokeOffset,
    };
  });

  const members = metrics.memberWorkload.length > 0
    ? metrics.memberWorkload
    : [
        {
          userId: '1',
          fullName: 'Sarah Jenkins',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces',
          activeTaskCount: 8,
          totalTaskCount: 18,
          completedCount: 10,
          inProgressCount: 5,
          todoCount: 3,
          isOverloaded: false,
        },
        {
          userId: '2',
          fullName: 'Marcus Johnson',
          avatarUrl: null,
          activeTaskCount: 16,
          totalTaskCount: 24,
          completedCount: 8,
          inProgressCount: 12,
          todoCount: 4,
          isOverloaded: true,
        },
        {
          userId: '3',
          fullName: 'David Chen',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
          activeTaskCount: 4,
          totalTaskCount: 12,
          completedCount: 8,
          inProgressCount: 2,
          todoCount: 2,
          isOverloaded: false,
        },
        {
          userId: '4',
          fullName: 'Elena Rodriguez',
          avatarUrl: null,
          activeTaskCount: 5,
          totalTaskCount: 9,
          completedCount: 4,
          inProgressCount: 3,
          todoCount: 2,
          isOverloaded: false,
        },
      ];

  return (
    <div className="analytics-grid">
      {/* ── Card Trái: Phân bổ trạng thái (Donut Chart) ── */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <div>
            <h3 className="analytics-title">Phân bổ trạng thái</h3>
            <p className="analytics-subtitle">Phân phối nhiệm vụ hiện tại</p>
          </div>
        </div>

        <div className="donut-chart-container">
          <div className="donut-svg-wrapper">
            <svg width="180" height="180" viewBox="0 0 180 180" className="donut-svg">
              {/* Background ring */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="20"
              />
              {/* Segments */}
              {donutSegments.map((seg) => (
                <circle
                  key={seg.columnId}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="20"
                  strokeDasharray={`${seg.strokeDash} ${circumference}`}
                  strokeDashoffset={seg.strokeOffset}
                  transform="rotate(-90 90 90)"
                  className="donut-segment"
                />
              ))}
            </svg>
            {/* Center label */}
            <div className="donut-center-label">
              <span className="donut-center-num">{total}</span>
              <span className="donut-center-sub">TỔNG</span>
            </div>
          </div>

          {/* Legend */}
          <div className="donut-legend">
            {donutSegments.map((seg) => (
              <div className="donut-legend-item" key={seg.columnId}>
                <span className="legend-dot" style={{ background: seg.color }}></span>
                <span className="legend-name">{seg.columnName} ({seg.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Card Phải: Ma trận khối lượng công việc (Workload Matrix) ── */}
      <div className="analytics-card">
        <div className="analytics-card-header workload-header">
          <div>
            <h3 className="analytics-title">Ma trận khối lượng công việc</h3>
            <p className="analytics-subtitle">Phân bổ nhiệm vụ theo thành viên</p>
          </div>
          <button className="icon-btn-filter" title="Bộ lọc" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" x2="14" y1="4" y2="4" />
              <line x1="10" x2="3" y1="4" y2="4" />
              <line x1="21" x2="12" y1="12" y2="12" />
              <line x1="8" x2="3" y1="12" y2="12" />
              <line x1="21" x2="16" y1="20" y2="20" />
              <line x1="12" x2="3" y1="20" y2="20" />
              <line x1="14" x2="14" y1="2" y2="6" />
              <line x1="8" x2="8" y1="10" y2="14" />
              <line x1="16" x2="16" y1="18" y2="22" />
            </svg>
          </button>
        </div>

        <div className="workload-list">
          {members.map((member) => {
            const memberTotal = member.totalTaskCount ?? (member.activeTaskCount + 6);
            const done = member.completedCount ?? Math.round(memberTotal * 0.5);
            const inProg = member.inProgressCount ?? Math.round(memberTotal * 0.3);
            const todo = member.todoCount ?? (memberTotal - done - inProg);

            const donePct = (done / memberTotal) * 100;
            const inProgPct = (inProg / memberTotal) * 100;
            const todoPct = (todo / memberTotal) * 100;

            // Initials avatar fallback
            const initials = member.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div className="workload-row" key={member.userId}>
                <div className="workload-member-info">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.fullName}
                      className="workload-avatar"
                    />
                  ) : (
                    <div className="workload-avatar-initials">
                      {initials}
                    </div>
                  )}
                  <span className="workload-name">{member.fullName}</span>
                </div>

                <div className="workload-bar-wrap">
                  <div className="workload-stacked-bar">
                    <div
                      className="bar-seg-done"
                      style={{ width: `${donePct}%` }}
                      title={`Hoàn thành: ${done}`}
                    ></div>
                    <div
                      className="bar-seg-progress"
                      style={{ width: `${inProgPct}%` }}
                      title={`Đang làm: ${inProg}`}
                    ></div>
                    <div
                      className="bar-seg-todo"
                      style={{ width: `${todoPct}%` }}
                      title={`Cần làm: ${todo}`}
                    ></div>
                  </div>
                </div>

                <div className="workload-task-count">
                  <span>{memberTotal} Nhiệm vụ</span>
                  {member.isOverloaded && (
                    <span className="overload-badge">Tải cao</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Status Legend */}
        <div className="workload-legend">
          <div className="legend-chip">
            <span className="legend-dot bg-done"></span>
            <span>HOÀN THÀNH</span>
          </div>
          <div className="legend-chip">
            <span className="legend-dot bg-progress"></span>
            <span>ĐANG LÀM</span>
          </div>
          <div className="legend-chip">
            <span className="legend-dot bg-todo"></span>
            <span>CẦN LÀM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
