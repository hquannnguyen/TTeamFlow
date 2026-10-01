import { DashboardMetrics } from '../types/dashboard.types';
import { getMediaUrl } from '../../../api/http';

interface DashboardChartsProps {
  metrics: DashboardMetrics;
}

export function DashboardCharts({ metrics }: DashboardChartsProps) {
  const total = metrics.totalTasks ?? 0;

  // Donut chart calculations
  const radius = 62;
  const circumference = 2 * Math.PI * radius;

  // Prepare segments for donut (100% dữ liệu thật từ backend)
  const dist = metrics.statusDistribution || [];

  let cumulativePercent = 0;
  const donutSegments = dist.map((item) => {
    const pct = item.percentage ?? (total > 0 ? Math.round((item.count / total) * 100) : 0);
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

  const members = metrics.memberWorkload || [];
  const maxActiveTasks = Math.max(8, ...members.map((m) => m.activeTaskCount || 0));

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
              {total > 0 &&
                donutSegments.map((seg) => (
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
            {dist.length === 0 || total === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                Chưa có dữ liệu trạng thái
              </div>
            ) : (
              donutSegments.map((seg) => (
                <div className="donut-legend-item" key={seg.columnId}>
                  <span className="legend-dot" style={{ background: seg.color }}></span>
                  <span className="legend-name">{seg.columnName} ({seg.pct}%)</span>
                </div>
              ))
            )}
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
        </div>

        <div className="workload-list">
          {members.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 16px',
                color: '#94a3b8',
                fontSize: '13.5px',
              }}
            >
              Chưa có thành viên nào được phân công nhiệm vụ
            </div>
          ) : (
            members.map((member) => {
              const activeCount = member.activeTaskCount ?? 0;
              const hasBreakdown =
                member.completedCount !== undefined ||
                member.inProgressCount !== undefined ||
                member.todoCount !== undefined;

              const memberTotal = member.totalTaskCount ?? activeCount;
              const done = member.completedCount ?? 0;
              const inProg = member.inProgressCount ?? activeCount;
              const todo = member.todoCount ?? 0;

              const donePct = memberTotal > 0 ? (done / memberTotal) * 100 : 0;
              const inProgPct = memberTotal > 0 ? (inProg / memberTotal) * 100 : 0;
              const todoPct = memberTotal > 0 ? (todo / memberTotal) * 100 : 0;

              // Tỷ lệ tải công việc dựa trên ngưỡng maxActiveTasks
              const workloadPct = Math.min(
                100,
                Math.max(activeCount > 0 ? 8 : 0, Math.round((activeCount / maxActiveTasks) * 100))
              );

              // Initials avatar fallback
              const initials = (member.fullName || 'U')
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'U';

              return (
                <div className="workload-row" key={member.userId}>
                  <div className="workload-member-info">
                    {getMediaUrl(member.avatarUrl) ? (
                      <img
                        src={getMediaUrl(member.avatarUrl)!}
                        alt={member.fullName}
                        className="workload-avatar"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
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
                      {hasBreakdown ? (
                        <>
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
                        </>
                      ) : (
                        <div
                          className="bar-seg-progress"
                          style={{
                            width: `${workloadPct}%`,
                            background: member.isOverloaded ? '#ef4444' : '#3b82f6',
                          }}
                          title={`Đang xử lý: ${activeCount} việc`}
                        ></div>
                      )}
                    </div>
                  </div>

                  <div className="workload-task-count">
                    <span>{activeCount} Việc</span>
                    {member.isOverloaded && (
                      <span className="overload-badge">Tải cao</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Status Legend */}
        {members.length > 0 && (
          <div className="workload-legend">
            <div className="legend-chip">
              <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
              <span>ĐANG XỬ LÝ</span>
            </div>
            <div className="legend-chip">
              <span className="legend-dot" style={{ background: '#ef4444' }}></span>
              <span>TẢI CAO (≥8)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
