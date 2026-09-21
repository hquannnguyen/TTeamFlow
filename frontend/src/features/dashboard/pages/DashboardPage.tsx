import { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics } from '../api/dashboard.api';
import { DashboardStats } from '../components/DashboardStats';
import { DashboardCharts } from '../components/DashboardCharts';
import { getProjects } from '../../projects/api/projects.api';
import { useActiveProjectStore } from '../../projects/store/active-project.store';
import { ProjectSelectDropdown } from '../../projects/components/ProjectSelectDropdown';

export function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeProjectId, setActiveProjectId } = useActiveProjectStore();

  // Lấy danh sách dự án của người dùng
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    isError: isErrorProjects,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  // Chọn projectId ưu tiên:
  // 1. Param từ URL (nếu có trong danh sách projects)
  // 2. activeProjectId từ store (nếu có trong danh sách projects)
  // 3. Dự án đầu tiên trong projects
  const currentProjectId = useMemo(() => {
    if (projectId && projects.some((p) => p.id === projectId)) {
      return projectId;
    }
    if (activeProjectId && projects.some((p) => p.id === activeProjectId)) {
      return activeProjectId;
    }
    return projects.length > 0 ? projects[0].id : '';
  }, [projectId, activeProjectId, projects]);

  // Đồng bộ activeProjectId khi currentProjectId được xác định
  useEffect(() => {
    if (currentProjectId && currentProjectId !== activeProjectId) {
      setActiveProjectId(currentProjectId);
    }
  }, [currentProjectId, activeProjectId, setActiveProjectId]);

  // Cập nhật URL nếu đang ở /dashboard nhưng đã xác định currentProjectId
  useEffect(() => {
    if (!projectId && currentProjectId) {
      navigate(`/projects/${currentProjectId}/dashboard`, { replace: true });
    }
  }, [projectId, currentProjectId, navigate]);

  // Lấy metrics qua TanStack Query theo chuẩn convention ['dashboard', projectId]
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    isError: isErrorMetrics,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['dashboard', currentProjectId],
    queryFn: () => getDashboardMetrics(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  // 1. Loading State
  if (isLoadingProjects || (Boolean(currentProjectId) && isLoadingMetrics)) {
    return (
      <div className="dashboard-loading-state">
        <div className="spinner-ring" />
        <p className="loading-text">Đang tải dữ liệu tổng quan phân tích...</p>
      </div>
    );
  }

  // 2. Empty State: Người dùng chưa có dự án nào
  if (!isLoadingProjects && projects.length === 0) {
    return (
      <div className="dashboard-error-state" style={{ minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📂</div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-800, #1e293b)' }}>
          Chưa có dự án nào
        </h2>
        <p style={{ maxWidth: '420px', color: 'var(--gray-500, #64748b)', fontSize: '14px', lineHeight: 1.5 }}>
          Bạn chưa tham gia hoặc tạo dự án nào. Hãy tạo hoặc tham gia dự án để bắt đầu xem phân tích số liệu.
        </p>
        <button
          className="btn-retry"
          onClick={() => navigate('/projects')}
          style={{ marginTop: '12px' }}
        >
          Đến danh sách dự án
        </button>
      </div>
    );
  }

  // 3. Error State: Lỗi khi tải dữ liệu dự án hoặc metrics
  if (isErrorProjects || isErrorMetrics || (!metrics && Boolean(currentProjectId))) {
    const errorMsg =
      metricsError instanceof Error
        ? metricsError.message
        : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.';

    return (
      <div className="dashboard-error-state" style={{ minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '44px', marginBottom: '8px' }}>⚠️</div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-800, #1e293b)' }}>
          Không thể tải dữ liệu phân tích
        </h2>
        <p style={{ maxWidth: '460px', color: 'var(--gray-500, #64748b)', fontSize: '14px', lineHeight: 1.5 }}>
          {errorMsg}
        </p>
        <button
          className="btn-retry"
          onClick={() => {
            if (isErrorProjects) refetchProjects();
            if (isErrorMetrics) refetchMetrics();
          }}
          style={{ marginTop: '12px' }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="dashboard-page-container">
      {/* ── Header trang Dashboard ── */}
      <div className="dashboard-header-row">
        <div className="dashboard-title-group">
          <h1 className="dashboard-main-title">Tổng quan phân tích</h1>
          <p className="dashboard-main-subtitle">
            Theo dõi sức khỏe dự án, tốc độ đội ngũ và phân bổ nhiệm vụ qua các sprint.
          </p>
        </div>

        <div className="dashboard-action-group">
          {projects.length > 0 && (
            <ProjectSelectDropdown
              projects={projects}
              currentProjectId={currentProjectId}
              onSelectProject={(selectedId) => {
                setActiveProjectId(selectedId);
                navigate(`/projects/${selectedId}/dashboard`);
              }}
              variant="compact"
            />
          )}

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

      {/* Gợi ý khi dự án chưa có task nào */}
      {metrics.totalTasks === 0 && (
        <div
          style={{
            background: 'var(--brand-50, #eff6ff)',
            border: '1px solid var(--brand-200, #bfdbfe)',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <span style={{ fontSize: '13.5px', color: 'var(--brand-900, #1e3a8a)' }}>
              Dự án này chưa có công việc nào. Hãy tạo nhiệm vụ trên bảng Kanban để theo dõi tiến độ và số liệu thực tế!
            </span>
          </div>
          <button
            className="btn-retry"
            style={{ padding: '6px 14px', fontSize: '12.5px', whiteSpace: 'nowrap' }}
            onClick={() => navigate(currentProjectId ? `/projects/${currentProjectId}/board` : '/board')}
          >
            Đến bảng Kanban →
          </button>
        </div>
      )}

      {/* ── Hàng 4 thẻ số liệu ── */}
      <DashboardStats metrics={metrics} />

      {/* ── 2 biểu đồ phân tích ── */}
      <DashboardCharts metrics={metrics} />
    </div>
  );
}