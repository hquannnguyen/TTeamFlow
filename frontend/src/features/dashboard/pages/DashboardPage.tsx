import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardMetrics } from '../types/dashboard.types';
import { getDashboardMetrics } from '../api/dashboard.api';
import { DashboardStats } from '../components/DashboardStats';
import { DashboardCharts } from '../components/DashboardCharts';

export function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30_days');

  useEffect(() => {
    setIsLoading(true);
    getDashboardMetrics(projectId || 'default')
      .then((data) => {
        setMetrics(data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="dashboard-loading-state">
        <div className="spinner-ring" />
        <p className="loading-text">Đang tải dữ liệu tổng quan phân tích...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="dashboard-error-state">
        <p>Không có dữ liệu phân tích.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page-container">
      {/* ── Header trang Dashboard ── */}
      <div className="dashboard-header-row">
        <div className="dashboard-title-group">
          <div className="live-indicator-badge">
            <span className="live-dot" />
            CHỈ SỐ TRỰC TIẾP
          </div>
          <h1 className="dashboard-main-title">Tổng quan phân tích</h1>
          <p className="dashboard-main-subtitle">
            Theo dõi sức khỏe dự án, tốc độ đội ngũ và phân bổ nhiệm vụ qua các sprint.
          </p>
        </div>

        <div className="dashboard-action-group">
          <div className="date-filter-dropdown">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="date-select"
            >
              <option value="7_days">7 ngày qua</option>
              <option value="30_days">30 ngày qua</option>
              <option value="90_days">3 tháng qua</option>
              <option value="this_sprint">Sprint hiện tại</option>
            </select>
            <svg className="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <button className="btn-export-report" type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* ── Hàng 4 thẻ số liệu ── */}
      <DashboardStats metrics={metrics} />

      {/* ── 2 biểu đồ phân tích ── */}
      <DashboardCharts metrics={metrics} />
    </div>
  );
}