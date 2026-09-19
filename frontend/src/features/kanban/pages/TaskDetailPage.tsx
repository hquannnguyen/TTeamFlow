import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBoard,
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
} from '../api/kanban.api';
import { getProject } from '../../projects/api/projects.api';
import { getMediaUrl } from '../../../api/http';
import { toast } from '../../../components/ui/toast.store';
import { MemberAutocomplete } from '../components/MemberAutocomplete';

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDateForInput(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatDisplayDate(dateStr?: string | null) {
  if (!dateStr) return 'Chưa đặt thời hạn';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Chưa đặt thời hạn';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  }).format(d);
}

function renderCommentWithMentions(text: string) {
  const parts = text.split(/(@[^\s@]+(?:\s+[^\s@]+)?)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('@')) {
      return (
        <span key={idx} className="comment-mention-tag">
          {part}
        </span>
      );
    }
    return part;
  });
}

interface TimelineItem {
  id: string;
  actorName: string;
  actorAvatar?: string | null;
  actionText: string;
  messageContent?: string;
  createdAt: string;
  isComment: boolean;
}

export function TaskDetailPage() {
  const { projectId = '', taskId = '' } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'desc' | 'checklists'>('desc');
  const [activeBottomTab, setActiveBottomTab] = useState<'comments' | 'activity'>('comments');

  const [description, setDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Mention / Tag state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  // Fetch Project Info
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });

  // Fetch Columns
  const { data: columns = [] } = useQuery({
    queryKey: ['kanban', projectId],
    queryFn: () => getBoard(projectId),
    enabled: Boolean(projectId),
  });

  // Fetch Task Detail
  const { data: task, isLoading: isLoadingTask } = useQuery({
    queryKey: ['taskDetail', taskId],
    queryFn: () => getTaskDetail(taskId),
    enabled: Boolean(taskId),
  });

  // Fetch Comments
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => getComments(taskId),
    enabled: Boolean(taskId),
  });

  // Fetch Checklists
  const { data: checklists = [] } = useQuery({
    queryKey: ['checklists', taskId],
    queryFn: () => getChecklists(taskId),
    enabled: Boolean(taskId),
  });

  // Fetch Activity Logs
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activityLogs', projectId],
    queryFn: () => getActivityLogs(projectId),
    enabled: Boolean(projectId),
  });

  useEffect(() => {
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
      toast.success('Đã cập nhật nhiệm vụ');
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
      toast.success('Đã chuyển trạng thái');
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => createComment(taskId, content),
    onSuccess: () => {
      setNewComment('');
      setShowMentionDropdown(false);
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs', projectId] });
      toast.success('Đã gửi tin nhắn');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs', projectId] });
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
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      updateChecklistItem(id, { isCompleted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', taskId] });
      queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
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

  const members = useMemo(() => project?.members || [], [project?.members]);
  const assignedUsers = task?.assignments?.map((a) => a.user) || [];
  const assignedUserIds = new Set(assignedUsers.map((u) => u.id));
  const unassignedMembers = members.filter((m) => !assignedUserIds.has(m.user.id));
  const taskLogs = activityLogs.filter((log) => log.entityId === taskId || log.metadata?.taskId === taskId);

  // Handle comment typing & mention detection
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    const match = /@(\S*)$/.exec(val);
    if (match) {
      setMentionFilter(match[1].toLowerCase());
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleSelectMention = (memberName: string) => {
    setNewComment((prev) => {
      return prev.replace(/@\S*$/, '') + `@${memberName} `;
    });
    setShowMentionDropdown(false);
  };

  // Helper to format activity action with detailed Vietnamese text
  const formatActivityAction = useCallback(
    (log: { action: string; metadata?: Record<string, unknown> | null }): string => {
      const meta = log.metadata;
      if (typeof meta?.description === 'string') {
        return meta.description;
      }

      switch (log.action) {
        case 'TASK_CREATED':
          return 'đã tạo nhiệm vụ này';

        case 'TASK_COMPLETED':
          return 'đã hoàn thành nhiệm vụ';

        case 'TASK_MOVED': {
          const toColName =
            (typeof meta?.toColumnName === 'string' ? meta.toColumnName : undefined) ||
            columns.find((c) => c.id === meta?.toColumnId)?.name;
          return toColName
            ? `đã chuyển nhiệm vụ sang cột "${toColName}"`
            : 'đã chuyển nhiệm vụ sang cột khác';
        }

        case 'TASK_ASSIGNED': {
          const targetUserId = typeof meta?.assignedUserId === 'string' ? meta.assignedUserId : undefined;
          const targetUser = members.find((m) => m.user.id === targetUserId);
          const name = targetUser?.user.fullName || (typeof meta?.assignedUserName === 'string' ? meta.assignedUserName : undefined);
          return name ? `đã phân công nhiệm vụ cho ${name}` : 'đã phân công nhiệm vụ';
        }

        case 'TASK_UNASSIGNED': {
          const targetUserId = typeof meta?.unassignedUserId === 'string' ? meta.unassignedUserId : undefined;
          const targetUser = members.find((m) => m.user.id === targetUserId);
          const name = targetUser?.user.fullName || (typeof meta?.unassignedUserName === 'string' ? meta.unassignedUserName : undefined);
          return name ? `đã gỡ phân công của ${name}` : 'đã gỡ phân công nhiệm vụ';
        }

        case 'COMMENT_CREATED':
          return 'đã gửi tin nhắn:';

        case 'TASK_UPDATED': {
          if (meta) {
            if (meta.newDueDate !== undefined) {
              return `đã thay đổi thời hạn sang ${formatDisplayDate(meta.newDueDate as string | null)}`;
            }
            if (typeof meta.newPriority === 'string') {
              const pMap: Record<string, string> = {
                LOW: 'Thấp',
                MEDIUM: 'Trung bình',
                HIGH: 'Cao',
                URGENT: 'Khẩn cấp',
              };
              return `đã thay đổi độ ưu tiên sang ${pMap[meta.newPriority] || meta.newPriority}`;
            }
            if (typeof meta.newTitle === 'string') {
              return `đã thay đổi tiêu đề thành "${meta.newTitle}"`;
            }
            if (meta.changeType === 'DESCRIPTION') {
              return 'đã cập nhật mô tả công việc';
            }
          }
          return 'đã cập nhật thông tin nhiệm vụ';
        }

        default:
          return 'đã cập nhật thông tin nhiệm vụ';
      }
    },
    [columns, members],
  );

  // Unified timeline combining activity logs and comments/messages
  const unifiedTimeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // 1. Activity logs
    taskLogs.forEach((log) => {
      items.push({
        id: `activity-${log.id}`,
        actorName: log.actor?.fullName || 'Hệ thống',
        actorAvatar: log.actor?.avatarUrl,
        actionText: formatActivityAction(log),
        messageContent:
          log.action === 'COMMENT_CREATED' && typeof log.metadata?.content === 'string'
            ? log.metadata.content
            : undefined,
        createdAt: log.createdAt,
        isComment: log.action === 'COMMENT_CREATED',
      });
    });

    // 2. Comments (as sent messages in timeline)
    comments.forEach((c) => {
      const alreadyInLogs = taskLogs.some(
        (l) => l.action === 'COMMENT_CREATED' && l.metadata?.commentId === c.id
      );
      if (!alreadyInLogs) {
        items.push({
          id: `comment-${c.id}`,
          actorName: c.author?.fullName || 'Thành viên',
          actorAvatar: c.author?.avatarUrl,
          actionText: 'đã gửi tin nhắn:',
          messageContent: c.content,
          createdAt: c.createdAt,
          isComment: true,
        });
      }
    });

    // Sort newest first
    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [taskLogs, comments, formatActivityAction]);

  if (isLoadingTask) {
    return (
      <div className="task-detail-page-wrapper" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="spinner-ring" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: '14px' }}>Đang tải thông tin chi tiết nhiệm vụ...</p>
      </div>
    );
  }

  return (
    <div className="task-detail-page-wrapper">
      {/* Top Header / Breadcrumb */}
      <div className="task-detail-top-bar">
        <div className="task-detail-breadcrumb">
          <button
            type="button"
            className="btn-back-kanban"
            onClick={() => navigate(projectId ? `/projects/${projectId}/board` : '/board')}
          >
            ← Bảng Kanban
          </button>
          <span style={{ color: '#94a3b8' }}>Nhiệm vụ / </span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{task?.title || 'Chi tiết nhiệm vụ'}</span>
        </div>
      </div>

      <div className="task-detail-scroll-body">
        {/* Header Meta Card */}
        <div className="task-detail-meta-card">
          <div className="task-detail-header-row">
            <div className="task-detail-title-col">
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
                  title="Click để chỉnh sửa tiêu đề"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {task?.title}
                </h1>
              )}
            </div>

            {/* Status Selector Badge in Header */}
            <div className="task-detail-status-col">
              <div className="task-status-badge-wrap">
                <span className="task-status-label">Trạng thái:</span>
                <select
                  className="task-status-select-pill"
                  value={task?.columnId || ''}
                  onChange={(e) => moveTaskMutation.mutate(e.target.value)}
                  title="Bấm để thay đổi trạng thái"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Meta Grid (Dự án, Người được phân công, Độ ưu tiên, Thời hạn) */}
          <div className="task-meta-grid">
            <div className="task-meta-item">
              <span className="task-meta-label">Dự án</span>
              <span className="task-meta-value">{project?.name || 'TTeamFlow'}</span>
            </div>

            {/* Multi-assignees */}
            <div className="task-meta-item">
              <span className="task-meta-label">Người được phân công</span>
              <div className="task-assignees-container">
                {assignedUsers.length === 0 ? (
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Chưa phân công
                  </span>
                ) : (
                  assignedUsers.map((u) => {
                    const avatar = getMediaUrl(u.avatarUrl);
                    return (
                      <div className="assignee-chip" key={u.id} title={u.fullName}>
                        {avatar ? (
                          <img src={avatar} alt={u.fullName} className="assignee-chip-avatar" />
                        ) : (
                          <div className="assignee-chip-avatar">{getInitials(u.fullName)}</div>
                        )}
                        <span className="assignee-chip-name">{u.fullName}</span>
                        <button
                          type="button"
                          className="btn-remove-assignee-chip"
                          title={`Gỡ ${u.fullName}`}
                          onClick={() => {
                            const remainingIds = assignedUsers
                              .filter((a) => a.id !== u.id)
                              .map((a) => a.id);
                            updateTaskMutation.mutate({ assigneeIds: remainingIds });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}

                {/* Searchable input to add assignee */}
                {unassignedMembers.length > 0 && (
                  <MemberAutocomplete
                    members={unassignedMembers}
                    mode="add"
                    onSelect={(user) => {
                      const nextIds = [...assignedUsers.map((u) => u.id), user.id];
                      updateTaskMutation.mutate({ assigneeIds: nextIds });
                    }}
                    placeholder="+ Thêm người (gõ tên)..."
                  />
                )}
              </div>
            </div>

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

            <div className="task-meta-item">
              <span className="task-meta-label">Thời hạn</span>
              <input
                type="datetime-local"
                className="task-meta-date-input"
                value={formatDateForInput(task?.dueDate)}
                onChange={(e) => {
                  const val = e.target.value;
                  const dateVal = val ? new Date(`${val}:00+07:00`).toISOString() : null;
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
                  {checklists.map((item) => {
                    const isChecked = Boolean(item.isCompleted ?? item.isDone);
                    return (
                      <div key={item.id} className="checklist-item-row">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            updateChecklistMutation.mutate({
                              id: item.id,
                              isCompleted: e.target.checked,
                            })
                          }
                        />
                        <span className={`checklist-text ${isChecked ? 'done' : ''}`}>
                          {item.content}
                        </span>
                        <button
                          type="button"
                          className="checklist-del-btn"
                          onClick={() => deleteChecklistMutation.mutate(item.id)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
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

        {/* Bottom Section: Gửi tin & Hoạt động */}
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
              Hoạt động ({unifiedTimeline.length})
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
                  {/* Floating Mention Popup above textarea */}
                  <div className="comment-input-wrap">
                    {showMentionDropdown && (
                      <div className="mention-dropdown-menu">
                        {members
                          .filter((m) =>
                            mentionFilter
                              ? m.user.fullName.toLowerCase().includes(mentionFilter)
                              : true
                          )
                          .map((m) => {
                            const avatar = getMediaUrl(m.user.avatarUrl);
                            return (
                              <button
                                key={m.user.id}
                                type="button"
                                className="mention-dropdown-item"
                                onClick={() => handleSelectMention(m.user.fullName)}
                              >
                                {avatar ? (
                                  <img
                                    src={avatar}
                                    alt={m.user.fullName}
                                    className="mention-avatar-sm"
                                  />
                                ) : (
                                  <div className="mention-avatar-sm">
                                    {getInitials(m.user.fullName)}
                                  </div>
                                )}
                                <span>{m.user.fullName}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}

                    <textarea
                      className="comment-textarea"
                      rows={3}
                      placeholder="Viết bình luận hoặc thông báo (Gõ @ để tag thành viên)..."
                      value={newComment}
                      onChange={handleCommentChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowMentionDropdown(false);
                        }
                      }}
                    />
                  </div>

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
                              {new Intl.DateTimeFormat('vi-VN', {
                                timeZone: 'Asia/Ho_Chi_Minh',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              }).format(new Date(c.createdAt))}
                            </span>
                          </div>
                          <p className="comment-text">{renderCommentWithMentions(c.content)}</p>
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
                {unifiedTimeline.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa có nhật ký hoạt động cho nhiệm vụ này.</p>
                ) : (
                  unifiedTimeline.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className="activity-avatar">{getInitials(item.actorName)}</div>
                      <div className="activity-info">
                        <span className="activity-actor">{item.actorName}</span>
                        <span className="activity-action">{item.actionText}</span>
                        {item.messageContent && (
                          <span className="activity-message-preview">
                            "{item.messageContent}"
                          </span>
                        )}
                      </div>
                      <span className="activity-time">
                        {new Intl.DateTimeFormat('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour12: false,
                        }).format(new Date(item.createdAt))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
