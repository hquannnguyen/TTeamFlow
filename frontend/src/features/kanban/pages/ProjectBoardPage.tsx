import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoard, moveTask, type KanbanTask, type KanbanColumn } from '../api/kanban.api';
import { getProjects, getProject } from '../../projects/api/projects.api';
import { KanbanTaskCard } from '../components/KanbanTaskCard';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { toast } from '../../../components/ui/toast.store';
import { getMediaUrl } from '../../../api/http';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch user's projects to allow quick switching
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  // Effective projectId: URL param or first available project
  const currentProjectId = projectId || (projects.length > 0 ? projects[0].id : '');

  // 2. Fetch active project details (name, key, members)
  const { data: project } = useQuery({
    queryKey: ['project', currentProjectId],
    queryFn: () => getProject(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  // 3. Fetch Kanban board columns & tasks
  const {
    data: columns = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['kanban', currentProjectId],
    queryFn: () => getBoard(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  // Filters state
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDefaultColumnId, setCreateDefaultColumnId] = useState<string>('');

  // Move Task Mutation (Task 17 API)
  const moveTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      targetColumnId,
      newPosition,
    }: {
      taskId: string;
      targetColumnId: string;
      newPosition: number;
    }) => moveTask(taskId, targetColumnId, newPosition),
    onMutate: async ({ taskId, targetColumnId }) => {
      // Cancel outgoing queries for optimistic update
      await queryClient.cancelQueries({ queryKey: ['kanban', currentProjectId] });
      const previousBoard = queryClient.getQueryData<KanbanColumn[]>(['kanban', currentProjectId]);

      if (previousBoard) {
        let movedTask: KanbanTask | null = null;
        // Remove task from current column
        const nextBoard = previousBoard.map((col) => {
          const found = col.tasks.find((t) => t.id === taskId);
          if (found) {
            movedTask = { ...found, columnId: targetColumnId };
            return {
              ...col,
              tasks: col.tasks.filter((t) => t.id !== taskId),
            };
          }
          return col;
        });

        // Add task to target column
        if (movedTask) {
          const targetCol = nextBoard.find((c) => c.id === targetColumnId);
          if (targetCol) {
            targetCol.tasks.push(movedTask);
          }
        }

        queryClient.setQueryData(['kanban', currentProjectId], nextBoard);
      }

      return { previousBoard };
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['kanban', currentProjectId], context.previousBoard);
      }
      const responseData =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
          : undefined;
      const msg = responseData?.message || 'Không thể di chuyển nhiệm vụ';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', currentProjectId] });
    },
  });

  const handleMoveTask = (taskId: string, targetColumnId: string) => {
    // Determine new position in target column
    const targetCol = columns.find((c) => c.id === targetColumnId);
    const maxPos = targetCol?.tasks.reduce((max, t) => Math.max(max, t.position), 0) ?? 0;
    const newPosition = maxPos + 1000;
    moveTaskMutation.mutate({ taskId, targetColumnId, newPosition });
  };

  // Filter tasks in columns
  const filteredColumns = useMemo(() => {
    return columns.map((col) => {
      const filteredTasks = col.tasks.filter((task) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchDesc = task.description?.toLowerCase().includes(q);
          const matchNum = String(task.taskNumber || '').includes(q);
          if (!matchTitle && !matchDesc && !matchNum) return false;
        }

        // Assignee filter
        if (selectedAssignee !== 'ALL') {
          const hasAssignee = task.assignments?.some((a) => a.user.id === selectedAssignee);
          if (!hasAssignee) return false;
        }

        // Priority filter
        if (selectedPriority !== 'ALL') {
          if (task.priority !== selectedPriority) return false;
        }

        // Overdue filter
        if (onlyOverdue) {
          if (!task.dueDate || task.completedAt || col.isCompleted) return false;
          const isLate = new Date(task.dueDate).getTime() < Date.now();
          if (!isLate) return false;
        }

        return true;
      });

      return {
        ...col,
        tasks: filteredTasks,
      };
    });
  }, [columns, searchQuery, selectedAssignee, selectedPriority, onlyOverdue]);

  if (isLoadingProjects || (Boolean(currentProjectId) && isLoading)) {
    return (
      <div className="kanban-page-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinner-ring" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: '14px' }}>Đang tải bảng Kanban...</p>
      </div>
    );
  }

  if (!currentProjectId && projects.length === 0) {
    return (
      <div className="kanban-page-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div
          style={{
            maxWidth: '480px',
            margin: '40px auto',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '40px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#4f46e5',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
            Chưa có dự án nào
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Bạn cần có ít nhất 1 dự án để quản lý công việc và xem bảng Kanban. Vui lòng tạo dự án mới để bắt đầu.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/projects')}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            + Tạo dự án mới
          </button>
        </div>
      </div>
    );
  }

  if (isError || !currentProjectId) {
    return (
      <div className="kanban-page-container" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontSize: '15px' }}>
          Không thể tải dữ liệu bảng Kanban hoặc dự án không tồn tại.
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: '16px' }}
          onClick={() => navigate('/projects')}
        >
          Quay lại danh sách dự án
        </button>
      </div>
    );
  }

  return (
    <div className="kanban-page-container">
      {/* ── Top Header Section (Matching Stitch Design) ── */}
      <div className="kanban-header-wrap">
        <div className="kanban-header-top">
          {/* Title & Status Area */}
          <div className="kanban-title-area">
            {projects.length > 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  className="kanban-project-title"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                    paddingRight: '8px',
                  }}
                  value={currentProjectId}
                  onChange={(e) => navigate(`/projects/${e.target.value}/board`)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <h1 className="kanban-project-title">
                {project?.name || 'Giai đoạn phát triển 4'}
              </h1>
            )}

            <span className="kanban-status-badge">
              {project?.status === 'ARCHIVED' ? 'Đã lưu trữ' : 'Đang hoạt động'}
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="kanban-header-actions">
            {/* Members Avatar Group */}
            <div className="kanban-avatar-group">
              {project?.members && project.members.length > 0 ? (
                project.members.slice(0, 3).map((m) => {
                  const avatar = getMediaUrl(m.user.avatarUrl);
                  return avatar ? (
                    <img
                      key={m.user.id}
                      src={avatar}
                      alt={m.user.fullName}
                      className="kanban-avatar-item"
                      title={m.user.fullName}
                    />
                  ) : (
                    <div
                      key={m.user.id}
                      className="kanban-avatar-item"
                      title={m.user.fullName}
                    >
                      {m.user.fullName.charAt(0).toUpperCase()}
                    </div>
                  );
                })
              ) : (
                <div className="kanban-avatar-item">P</div>
              )}
              {project?.members && project.members.length > 3 && (
                <div className="kanban-avatar-item kanban-avatar-more">
                  +{project.members.length - 3}
                </div>
              )}
            </div>

            {/* Invite Button */}
            <button
              type="button"
              className="btn-invite-members"
              onClick={() => toast.info('Mở hộp thoại mời thành viên vào dự án')}
            >
              Mời
            </button>

            {/* View Switcher: Board vs List */}
            <div className="kanban-view-switcher">
              <button
                type="button"
                className={`kanban-view-btn ${viewMode === 'board' ? 'active' : ''}`}
                onClick={() => setViewMode('board')}
                title="Bảng Kanban"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                  <path d="M15 3v18" />
                </svg>
              </button>
              <button
                type="button"
                className={`kanban-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Dạng danh sách"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" x2="21" y1="6" y2="6" />
                  <line x1="8" x2="21" y1="12" y2="12" />
                  <line x1="8" x2="21" y1="18" y2="18" />
                  <line x1="3" x2="3.01" y1="6" y2="6" />
                  <line x1="3" x2="3.01" y1="12" y2="12" />
                  <line x1="3" x2="3.01" y1="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Add Task Button */}
            <button
              type="button"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '13px',
              }}
              onClick={() => {
                setCreateDefaultColumnId(columns[0]?.id || '');
                setIsCreateModalOpen(true);
              }}
            >
              + Tạo công việc
            </button>
          </div>
        </div>

        {/* Filters Bar (Matching Stitch Design) */}
        <div className="kanban-filters-bar">
          {/* Assignee Filter Dropdown */}
          <select
            className="kanban-filter-pill"
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
          >
            <option value="ALL">Người thực hiện: Tất cả</option>
            {project?.members?.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.fullName}
              </option>
            ))}
          </select>

          {/* Priority Filter Dropdown */}
          <select
            className="kanban-filter-pill"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            <option value="ALL">Độ ưu tiên: Tất cả</option>
            <option value="HIGH">Cao / Khẩn cấp</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp</option>
          </select>

          {/* Overdue Filter Button */}
          <button
            type="button"
            className={`kanban-filter-pill ${onlyOverdue ? 'active' : ''}`}
            onClick={() => setOnlyOverdue(!onlyOverdue)}
          >
            Quá hạn {onlyOverdue ? '✓' : ''}
          </button>

          {/* Search Input */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="kanban-filter-pill"
              style={{ width: '200px', cursor: 'text' }}
              placeholder="Tìm theo tên hoặc mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Main Kanban Columns Section ── */}
      <div className="kanban-columns-scroll-area">
        {filteredColumns.map((column) => {
          const colNameUpper = column.name.toUpperCase();
          const colType = column.isCompleted || colNameUpper.includes('DONE') || colNameUpper.includes('XONG')
            ? 'done'
            : colNameUpper.includes('DOING') || colNameUpper.includes('THỰC HIỆN')
            ? 'doing'
            : 'todo';

          return (
            <div className="kanban-column-card" key={column.id}>
              {/* Column Header */}
              <div className={`kanban-col-header-bar ${colType}`}>
                <div className="kanban-col-title-group">
                  <span className={`kanban-col-dot ${colType}`} />
                  <span className="kanban-col-name">{column.name}</span>
                  <span className="kanban-col-count-pill">{column.tasks.length}</span>
                </div>
                <button
                  type="button"
                  className="kanban-col-add-btn"
                  title="Thêm nhiệm vụ vào cột này"
                  onClick={() => {
                    setCreateDefaultColumnId(column.id);
                    setIsCreateModalOpen(true);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" x2="12" y1="5" y2="19" />
                    <line x1="5" x2="19" y1="12" y2="12" />
                  </svg>
                </button>
              </div>

              {/* Tasks List Box */}
              <div className="kanban-tasks-list-box">
                {column.tasks.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '12.5px',
                    }}
                  >
                    Chưa có nhiệm vụ
                  </div>
                ) : (
                  column.tasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      projectKey={project?.projectKey || 'TTF'}
                      isCompletedColumn={column.isCompleted}
                      currentColumnId={column.id}
                      availableColumns={columns.map((c) => ({ id: c.id, name: c.name }))}
                      onMoveToColumn={(targetColId) => handleMoveTask(task.id, targetColId)}
                      onClick={() => {
                        toast.info(`Nhiệm vụ: ${task.title}`);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        projectId={currentProjectId}
        columns={columns}
        defaultColumnId={createDefaultColumnId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
