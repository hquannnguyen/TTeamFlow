import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTaskDetail,
  updateTask,
  moveTask,
  getComments,
  createComment,
  deleteComment,
  getChecklists,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  getActivityLogs,
  type KanbanColumn,
} from '../api/kanban.api';
import { getMediaUrl } from '../../../api/http';
import { toast } from '../../../components/ui/toast.store';

interface TaskDetailViewProps {
  taskId: string;
  projectId: string;
  projectName?: string;
  columns: KanbanColumn[];
  members?: Array<{ user: { id: string; fullName: string; avatarUrl?: string | null } }>;
  isOpen: boolean;
  onClose: () => void;
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

function formatDisplayDate(dateStr?: string | null) {
  if (!dateStr) return 'Chưa đặt thời hạn';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Chưa đặt thời hạn';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day} thg ${month}, ${year}`;
}

export function TaskDetailView({
  taskId,
  projectId,
  projectName = 'TTeamFlow',
  columns,
  members = [],
  isOpen,
  onClose,
}: TaskDetailViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'desc' | 'checklists'>('desc');
  const [activeBottomTab, setActiveBottomTab] = useState<'comments' | 'activity'>('comments');

  // Local state for editing fields
  const [description, setDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // 1. Fetch Task Details
  const { data: task, isLoading: isLoadingTask } = useQuery({
    queryKey: ['taskDetail', taskId],
    queryFn: () => getTaskDetail(taskId),
    enabled: Boolean(taskId) && isOpen,
  });

  // 2. Fetch Comments
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => getComments(taskId),
    enabled: Boolean(taskId) && isOpen,
  });

  // 3. Fetch Checklists
  const { data: checklists = [] } = useQuery({
    queryKey: ['checklists', taskId],
    queryFn: () => getChecklists(taskId),
    enabled: Boolean(taskId) && isOpen,
  });

  // 4. Fetch Activity Logs
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activityLogs', projectId],
    queryFn: () => getActivityLogs(projectId),
    enabled: Boolean(projectId) && isOpen,
  });

  // Sync initial description & title input when task data loads
  React.useEffect(() => {
    if (task) {
      setDescription(task.description || '');
      setTitleInput(task.title || '');
    }
  }, [task]);

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: (dto: {
      title?: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueDate?: string | null;
      assigneeIds?: string[];
    }) => updateTask(taskId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs', projectId] });
      toast.success('Đã cập nhật thông tin nhiệm vụ');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể cập nhật';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: (targetColumnId: string) => {
      const targetCol = columns.find((c) => c.id === targetColumnId);
      const maxPos = targetCol?.tasks.reduce((max, t) => Math.max(max, t.position), 0) ?? 0;
      return moveTask(taskId, targetColumnId, maxPos + 1000);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs', projectId] });
      toast.success('Đã chuyển trạng thái cột thành công');
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => createComment(taskId, content),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      toast.success('Đã gửi bình luận');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Đã xóa bình luận');
    },
  });

  const createChecklistMutation = useMutation({
    mutationFn: (content: string) => createChecklistItem(taskId, content),
    onSuccess: () => {
      setNewChecklist('');
      queryClient.invalidateQueries({ queryKey: ['checklists', taskId] });
      queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban', projectId] });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      updateChecklistItem(id, { isDone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban', projectId] });
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: (id: string) => deleteChecklistItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban', projectId] });
    },
  });

  if (!isOpen) return null;

  const currentAssignee = task?.assignments && task.assignments.length > 0 ? task.assignments[0].user : null;
  const avatarUrl = getMediaUrl(currentAssignee?.avatarUrl);

  const taskLogs = activityLogs.filter((log) => log.entityId === taskId || log.metadata?.taskId === taskId);

  return (
    <div className="task-detail-backdrop" onClick={onClose}>
      <div className="task-detail-container" onClick={(e) => e.stopPropagation()}>
        {/* Top Header / Status Pipeline Bar */}
        <div className="task-detail-top-bar">
          <div className="task-detail-breadcrumb">
            <span style={{ color: '#94a3b8' }}>Nhiệm vụ / </span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{task?.title || 'Bảng Kanban'}</span>
          </div>
          <button type="button" className="task-detail-close-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* Pipeline Columns Tabs Bar */}
        <div className="task-detail-pipeline-bar">
          {columns.map((col) => {
            const isActive = task?.columnId === col.id;
            return (
              <button
                key={col.id}
                type="button"
                className={`pipeline-tab ${isActive ? 'active' : ''}`}
                onClick={() => moveTaskMutation.mutate(col.id)}
              >
                <span>{col.name}</span>
                {isActive && <span className="pipeline-time-badge">Hiện tại</span>}
              </button>
            );
          })}
        </div>

        {isLoadingTask ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner-ring" style={{ margin: '0 auto 16px' }} />
            Đang tải chi tiết công việc...
          </div>
        ) : (
          <div className="task-detail-scroll-body">
            {/* Header Meta Card */}
            <div className="task-detail-meta-card">
              {/* Task Title */}
              <div className="task-detail-title-row">
                {isEditingTitle ? (
                  <input
                    type="text"
                    className="task-title-input"
                    value={titleInput}
                    autoFocus
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      if (titleInput.trim() && titleInput !== task?.title) {
                        updateTaskMutation.mutate({ title: titleInput.trim() });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingTitle(false);
                        if (titleInput.trim() && titleInput !== task?.title) {
                          updateTaskMutation.mutate({ title: titleInput.trim() });
                        }
                      }
                    }}
                  />
                ) : (
                  <h1
                    className="task-detail-main-title"
                    title="Click để đổi tên công việc"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {task?.title}
                  </h1>
                )}
              </div>

              {/* Meta Grid Info (Dự án, Người phân công, Độ ưu tiên, Thời hạn) */}
              <div className="task-meta-grid">
                {/* Dự án */}
                <div className="task-meta-item">
                  <span className="task-meta-label">Dự án</span>
                  <span className="task-meta-value">{projectName}</span>
                </div>

                {/* Người được phân công */}
                <div className="task-meta-item">
                  <span className="task-meta-label">Người được phân công</span>
                  <div className="task-assignee-select-wrap">
                    {currentAssignee ? (
                      avatarUrl ? (
                        <img src={avatarUrl} alt={currentAssignee.fullName} className="assignee-avatar-sm" />
                      ) : (
                        <div className="assignee-avatar-sm">{getInitials(currentAssignee.fullName)}</div>
                      )
                    ) : (
                      <div className="assignee-avatar-sm">?</div>
                    )}

                    <select
                      className="task-meta-select"
                      value={currentAssignee?.id || ''}
                      onChange={(e) => {
                        const newUserId = e.target.value;
                        updateTaskMutation.mutate({ assigneeIds: newUserId ? [newUserId] : [] });
                      }}
                    >
                      <option value="">Chưa phân công</option>
                      {members.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Độ ưu tiên */}
                <div className="task-meta-item">
                  <span className="task-meta-label">Độ ưu tiên</span>
                  <select
                    className="task-meta-select priority"
                    value={task?.priority || 'MEDIUM'}
                    onChange={(e) => {
                      updateTaskMutation.mutate({
                        priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
                      });
                    }}
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </div>

                {/* Thời hạn */}
                <div className="task-meta-item">
                  <span className="task-meta-label">Thời hạn</span>
                  <input
                    type="datetime-local"
                    className="task-meta-date-input"
                    value={formatDate(task?.dueDate)}
                    onChange={(e) => {
                      const dateVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                      updateTaskMutation.mutate({ dueDate: dateVal });
                    }}
                  />
                  <span className="task-meta-date-display">{formatDisplayDate(task?.dueDate)}</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Mô tả & Nhiệm vụ phụ */}
            <div className="task-detail-middle-section">
              <div className="task-tab-headers">
                <button
                  type="button"
                  className={`task-tab-btn ${activeTab === 'desc' ? 'active' : ''}`}
                  onClick={() => setActiveTab('desc')}
                >
                  Mô tả
                </button>
                <button
                  type="button"
                  className={`task-tab-btn ${activeTab === 'checklists' ? 'active' : ''}`}
                  onClick={() => setActiveTab('checklists')}
                >
                  Nhiệm vụ phụ ({checklists.length})
                </button>
              </div>

              <div className="task-tab-content">
                {activeTab === 'desc' ? (
                  <div className="task-description-box">
                    <textarea
                      className="task-desc-textarea"
                      rows={5}
                      placeholder="Mô tả nội dung công việc cần làm..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => updateTaskMutation.mutate({ description })}
                        disabled={updateTaskMutation.isPending}
                      >
                        {updateTaskMutation.isPending ? 'Đang lưu...' : 'Lưu mô tả'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="task-checklists-box">
                    <div className="checklists-list">
                      {checklists.map((item) => (
                        <div key={item.id} className="checklist-item-row">
                          <input
                            type="checkbox"
                            checked={item.isDone}
                            onChange={(e) =>
                              updateChecklistMutation.mutate({ id: item.id, isDone: e.target.checked })
                            }
                          />
                          <span className={`checklist-text ${item.isDone ? 'done' : ''}`}>{item.content}</span>
                          <button
                            type="button"
                            className="checklist-del-btn"
                            onClick={() => deleteChecklistMutation.mutate(item.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newChecklist.trim()) return;
                        createChecklistMutation.mutate(newChecklist.trim());
                      }}
                      style={{ display: 'flex', gap: '8px', marginTop: '14px' }}
                    >
                      <input
                        type="text"
                        className="form-input"
                        placeholder="+ Thêm nhiệm vụ phụ..."
                        value={newChecklist}
                        onChange={(e) => setNewChecklist(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="btn-secondary">
                        Thêm
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Gửi tin (Comments) & Hoạt động (Activity Logs) */}
            <div className="task-detail-bottom-section">
              <div className="task-tab-headers">
                <button
                  type="button"
                  className={`task-tab-btn ${activeBottomTab === 'comments' ? 'active' : ''}`}
                  onClick={() => setActiveBottomTab('comments')}
                >
                  Gửi tin ({comments.length})
                </button>
                <button
                  type="button"
                  className={`task-tab-btn ${activeBottomTab === 'activity' ? 'active' : ''}`}
                  onClick={() => setActiveBottomTab('activity')}
                >
                  Hoạt động ({taskLogs.length})
                </button>
              </div>

              <div className="task-tab-content">
                {activeBottomTab === 'comments' ? (
                  <div className="comments-container">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newComment.trim()) return;
                        createCommentMutation.mutate(newComment.trim());
                      }}
                      className="comment-post-form"
                    >
                      <textarea
                        className="comment-textarea"
                        rows={3}
                        placeholder="Viết bình luận hoặc thông báo..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={createCommentMutation.isPending || !newComment.trim()}
                        >
                          {createCommentMutation.isPending ? 'Đang gửi...' : 'Gửi tin'}
                        </button>
                      </div>
                    </form>

                    <div className="comments-stream">
                      {comments.map((c) => {
                        const authorAvatar = getMediaUrl(c.author?.avatarUrl);
                        return (
                          <div key={c.id} className="comment-item">
                            {authorAvatar ? (
                              <img src={authorAvatar} alt={c.author?.fullName} className="comment-avatar" />
                            ) : (
                              <div className="comment-avatar">{getInitials(c.author?.fullName)}</div>
                            )}

                            <div className="comment-body">
                              <div className="comment-meta">
                                <span className="comment-author">{c.author?.fullName || 'Thành viên'}</span>
                                <span className="comment-time">
                                  {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="comment-text">{c.content}</p>
                            </div>

                            <button
                              type="button"
                              className="comment-del-btn"
                              title="Xóa bình luận"
                              onClick={() => deleteCommentMutation.mutate(c.id)}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="activity-stream">
                    {taskLogs.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa có nhật ký hoạt động cho nhiệm vụ này.</p>
                    ) : (
                      taskLogs.map((log) => (
                        <div key={log.id} className="activity-item">
                          <div className="activity-avatar">{getInitials(log.actor?.fullName)}</div>
                          <div className="activity-info">
                            <span className="activity-actor">{log.actor?.fullName || 'Hệ thống'}</span>
                            <span className="activity-action">
                              {log.action === 'TASK_CREATED'
                                ? 'Nhiệm vụ đã được tạo'
                                : log.action === 'TASK_MOVED'
                                ? 'Đã chuyển nhiệm vụ'
                                : log.action === 'TASK_COMPLETED'
                                ? 'Đã hoàn thành nhiệm vụ'
                                : log.action}
                            </span>
                            <span className="activity-time">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
