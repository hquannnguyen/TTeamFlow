import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics } from '../api/dashboard.api';
import { DashboardStats } from '../components/DashboardStats';
import { DashboardCharts } from '../components/DashboardCharts';
import { getProjects } from '../../projects/api/projects.api';

export function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30_days');

  // Lấy danh sách dự án của người dùng
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  // Chọn projectId: từ URL params hoặc dự án đầu tiên trong danh sách
  const currentProjectId = projectId || (projects.length > 0 ? projects[0].id : '');

  // Lấy metrics qua TanStack Query theo chuẩn convention ['dashboard', projectId]
  const {
    data: metrics,
    isLoading,
  } = useQuery({
    queryKey: ['dashboard', currentProjectId],
    queryFn: () => getDashboardMetrics(currentProjectId),
  });

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
          {projects.length > 0 && (
            <div className="date-filter-dropdown" style={{ minWidth: 160 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
              </svg>
              <select
                value={currentProjectId}
                onChange={(e) => navigate(`/projects/${e.target.value}/dashboard`)}
                className="date-select"
                aria-label="Chọn dự án"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <svg className="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          )}

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