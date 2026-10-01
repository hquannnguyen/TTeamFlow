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
  type KanbanTask,
} from '../api/kanban.api';
import { getProject } from '../../projects/api/projects.api';
import { getMediaUrl } from '../../../api/http';
import { toast } from '../../../components/ui/toast.store';
import { MemberAutocomplete } from '../components/MemberAutocomplete';
import { broadcastNotificationUpdate } from '../../notifications/utils/broadcast.util';

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

function formatCommentTimestamp(dateStr?: string | Date | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timePart = timeFormatter.format(d);

  // Nếu quá 1 ngày (>= 24 giờ) hoặc ngày gửi khác ngày hôm nay (từ hôm qua trở về trước)
  if (diffMs >= ONE_DAY_MS || now.toDateString() !== d.toDateString()) {
    const isDifferentYear = now.getFullYear() !== d.getFullYear();
    const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      ...(isDifferentYear ? { year: 'numeric' } : {}),
    });
    return `${timePart} ${dateFormatter.format(d)}`;
  }

  return timePart;
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
  const [transferringUserId, setTransferringUserId] = useState<string | null>(null);

  // Mention / Tag state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  // Fetch Task Detail
  const { data: task, isLoading: isLoadingTask } = useQuery({
    queryKey: ['taskDetail', taskId],
    queryFn: () => getTaskDetail(taskId),
    enabled: Boolean(taskId),
  });

  const effectiveProjectId = projectId || task?.projectId || '';

  // Fetch Project Info
  const { data: project } = useQuery({
    queryKey: ['project', effectiveProjectId],
    queryFn: () => getProject(effectiveProjectId),
    enabled: Boolean(effectiveProjectId),
  });

  const isArchived = project?.status === 'ARCHIVED';

  // Fetch Columns
  const { data: columns = [] } = useQuery({
    queryKey: ['kanban', effectiveProjectId],
    queryFn: () => getBoard(effectiveProjectId),
    enabled: Boolean(effectiveProjectId),
  });

  // Fetch Comments (sorted newest first)
  const { data: rawComments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => getComments(taskId),
    enabled: Boolean(taskId),
  });

  const comments = useMemo(() => {
    return [...rawComments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [rawComments]);

  // Fetch Checklists
  const { data: checklists = [] } = useQuery({
    queryKey: ['checklists', taskId],
    queryFn: () => getChecklists(taskId),
    enabled: Boolean(taskId),
  });

  // Fetch Activity Logs specifically for this task
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activityLogs', effectiveProjectId, taskId],
    queryFn: () => getActivityLogs(effectiveProjectId, { entityId: taskId, limit: 100 }),
    enabled: Boolean(effectiveProjectId && taskId),
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
      queryClient.invalidateQueries({ queryKey: ['kanban', effectiveProjectId] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      broadcastNotificationUpdate();
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
    onSuccess: (_data, targetColumnId) => {
      queryClient.setQueryData<KanbanTask>(['taskDetail', taskId], (old) => {
        if (!old) return old;
        return {
          ...old,
          columnId: targetColumnId,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['project-activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      broadcastNotificationUpdate();
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
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      broadcastNotificationUpdate();
      toast.success('Đã gửi tin nhắn');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      toast.success('Đã xóa bình luận');
    },
  });

  const createChecklistMutation = useMutation({
    mutationFn: (content: string) => createChecklistItem(taskId, content),
    onSuccess: () => {
      setNewChecklist('');
      queryClient.invalidateQueries({ queryKey: ['checklists', taskId] });
      queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban', effectiveProjectId] });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      updateChecklistItem(id, { isCompleted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', taskId] });
      queryClient.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban', effectiveProjectId] });
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: (id: string) => deleteChecklistItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban', effectiveProjectId] });
    },
  });

  const members = useMemo(() => project?.members || [], [project?.members]);
  const assignedUsers = task?.assignments?.map((a) => a.user) || [];
  const assignedUserIds = new Set(assignedUsers.map((u) => u.id));
  const unassignedMembers = members.filter((m) => !assignedUserIds.has(m.user.id));
  const taskLogs = activityLogs.filter((log) => !log.entityId || log.entityId === taskId || log.metadata?.taskId === taskId);

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

        case 'TASK_COMPLETED': {
          const toCol =
            (typeof meta?.toColumnName === 'string' ? meta.toColumnName : undefined) ||
            columns.find((c) => c.id === meta?.toColumnId)?.name;
          return toCol
            ? `đã hoàn thành nhiệm vụ (chuyển sang "${toCol}")`
            : 'đã hoàn thành nhiệm vụ';
        }

        case 'TASK_MOVED': {
          const fromCol =
            (typeof meta?.fromColumnName === 'string' ? meta.fromColumnName : undefined) ||
            columns.find((c) => c.id === meta?.fromColumnId)?.name;
          const toCol =
            (typeof meta?.toColumnName === 'string' ? meta.toColumnName : undefined) ||
            columns.find((c) => c.id === meta?.toColumnId)?.name;

          if (fromCol && toCol) {
            return `đã chuyển trạng thái từ "${fromCol}" sang "${toCol}"`;
          }
          if (toCol) {
            return `đã chuyển trạng thái sang "${toCol}"`;
          }
          return 'đã chuyển trạng thái nhiệm vụ';
        }

        case 'TASK_ASSIGNED': {
          // Trường hợp chuyển giao task từ người A sang người B
          if (meta?.isTransfer) {
            const fromName =
              (typeof meta?.transferredFromUserName === 'string'
                ? meta.transferredFromUserName
                : undefined) ||
              members.find((m) => m.user.id === meta?.transferredFromUserId)?.user.fullName ||
              'thành viên';
            const toName =
              (typeof meta?.assignedUserName === 'string'
                ? meta.assignedUserName
                : undefined) ||
              members.find((m) => m.user.id === meta?.assignedUserId)?.user.fullName ||
              'thành viên';
            return `đã chuyển giao nhiệm vụ từ ${fromName} cho ${toName}`;
          }

          const targetUserId = typeof meta?.assignedUserId === 'string' ? meta.assignedUserId : undefined;
          const targetUser = members.find((m) => m.user.id === targetUserId);
          const name =
            (typeof meta?.assignedUserName === 'string' ? meta.assignedUserName : undefined) ||
            targetUser?.user.fullName;
          return name ? `đã phân công nhiệm vụ cho ${name}` : 'đã phân công nhiệm vụ';
        }

        case 'TASK_UNASSIGNED': {
          const targetUserId = typeof meta?.unassignedUserId === 'string' ? meta.unassignedUserId : undefined;
          const targetUser = members.find((m) => m.user.id === targetUserId);
          const name =
            (typeof meta?.unassignedUserName === 'string' ? meta.unassignedUserName : undefined) ||
            targetUser?.user.fullName;
          return name ? `đã gỡ phân công của ${name}` : 'đã gỡ phân công nhiệm vụ';
        }

        case 'COMMENT_CREATED':
          return 'đã gửi tin nhắn:';

        case 'TASK_UPDATED': {
          if (meta) {
            const pMap: Record<string, string> = {
              LOW: 'Thấp',
              MEDIUM: 'Trung bình',
              HIGH: 'Cao',
              URGENT: 'Khẩn cấp',
            };

            // Đổi mức độ ưu tiên
            if (meta.changeType === 'PRIORITY' || meta.newPriority !== undefined) {
              const oldP = typeof meta.oldPriority === 'string' ? pMap[meta.oldPriority] || meta.oldPriority : undefined;
              const newP = typeof meta.newPriority === 'string' ? pMap[meta.newPriority] || meta.newPriority : undefined;
              if (oldP && newP) {
                return `đã thay đổi mức độ ưu tiên từ ${oldP} sang ${newP}`;
              }
              if (newP) {
                return `đã thay đổi mức độ ưu tiên sang ${newP}`;
              }
            }

            // Đổi thời hạn deadline
            if (meta.changeType === 'DUE_DATE' || meta.newDueDate !== undefined) {
              const oldDue = meta.oldDueDate ? formatDisplayDate(meta.oldDueDate as string) : null;
              const newDue = meta.newDueDate ? formatDisplayDate(meta.newDueDate as string) : null;
              if (!newDue || newDue === 'Chưa đặt thời hạn') {
                return 'đã xóa hạn hoàn thành (deadline)';
              }
              if (oldDue && oldDue !== 'Chưa đặt thời hạn') {
                return `đã thay đổi hạn hoàn thành (deadline) từ ${oldDue} sang ${newDue}`;
              }
              return `đã đặt hạn hoàn thành (deadline) là ${newDue}`;
            }

            // Đổi tiêu đề
            if (typeof meta.newTitle === 'string') {
              return `đã thay đổi tiêu đề thành "${meta.newTitle}"`;
            }

            // Đổi mô tả
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
        const author = c.user || c.author;
        items.push({
          id: `comment-${c.id}`,
          actorName: author?.fullName || 'Thành viên',
          actorAvatar: author?.avatarUrl,
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
            onClick={() => navigate(effectiveProjectId ? `/projects/${effectiveProjectId}/board` : '/board')}
          >
            ← Bảng Kanban
          </button>
          <span style={{ color: '#94a3b8' }}>Nhiệm vụ / </span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{task?.title || 'Chi tiết nhiệm vụ'}</span>
        </div>
      </div>

      <div className="task-detail-scroll-body">
        {isArchived && (
          <div className="members-archived-banner" style={{ marginBottom: '16px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="5" x="2" y="3" rx="1" />
              <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
              <path d="M10 12h4" />
            </svg>
            <span>
              <strong>Dự án đã được lưu trữ (ARCHIVED):</strong> Nhiệm vụ này đang ở chế độ chỉ đọc. Không thể chỉnh sửa thông tin, danh sách kiểm tra hoặc bình luận cho đến khi dự án được khôi phục trạng thái hoạt động.
            </span>
          </div>
        )}

        {/* Header Meta Card */}
        <div className="task-detail-meta-card">
          <div className="task-detail-header-row">
            <div className="task-detail-title-col">
              {!isArchived && isEditingTitle ? (
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
                  style={{ cursor: isArchived ? 'default' : 'pointer' }}
                  title={isArchived ? task?.title : 'Click để chỉnh sửa tiêu đề'}
                  onClick={() => {
                    if (!isArchived) setIsEditingTitle(true);
                  }}
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
                  disabled={isArchived}
                  onChange={(e) => moveTaskMutation.mutate(e.target.value)}
                  title={isArchived ? 'Dự án đã lưu trữ' : 'Bấm để thay đổi trạng thái'}
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
                        {!isArchived && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                            {unassignedMembers.length > 0 && (
                              <button
                                type="button"
                                className="btn-transfer-assignee-chip"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  color: '#6366f1',
                                  fontWeight: 600,
                                  padding: '0 2px',
                                }}
                                title={`Chuyển giao nhiệm vụ của ${u.fullName} cho người khác`}
                                onClick={() =>
                                  setTransferringUserId(
                                    transferringUserId === u.id ? null : u.id,
                                  )
                                }
                              >
                                ⇄
                              </button>
                            )}
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
                        )}
                      </div>
                    );
                  })
                )}

                {/* Inline transfer selector if active */}
                {!isArchived && transferringUserId && (
                  <div
                    className="transfer-inline-selector"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                      marginRight: '6px',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Chuyển giao cho:
                    </span>
                    <select
                      className="task-meta-select"
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        height: '26px',
                      }}
                      defaultValue=""
                      onChange={(e) => {
                        const newId = e.target.value;
                        if (newId) {
                          const nextIds = assignedUsers.map((a) =>
                            a.id === transferringUserId ? newId : a.id,
                          );
                          updateTaskMutation.mutate({ assigneeIds: nextIds });
                          setTransferringUserId(null);
                        }
                      }}
                    >
                      <option value="" disabled>
                        Chọn thành viên...
                      </option>
                      {unassignedMembers.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.fullName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#94a3b8',
                      }}
                      onClick={() => setTransferringUserId(null)}
                      title="Hủy"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Searchable input to add assignee */}
                {!isArchived && unassignedMembers.length > 0 && (
                  <MemberAutocomplete
                    members={unassignedMembers}
                    mode="add"
                    onSelect={(user) => {
                      const nextIds = [...assignedUsers.map((u) => u.id), user.id];
                      updateTaskMutation.mutate({ assigneeIds: nextIds });
                    }}
                    placeholder="Thêm người (gõ tên)..."
                  />
                )}
              </div>
            </div>

            <div className="task-meta-item">
              <span className="task-meta-label">Độ ưu tiên</span>
              <select
                className="task-meta-select priority"
                value={task?.priority || 'MEDIUM'}
                disabled={isArchived}
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
                disabled={isArchived}
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
                  placeholder={isArchived ? 'Chưa có mô tả cho nhiệm vụ này.' : 'Mô tả nội dung công việc cần làm...'}
                  value={description}
                  disabled={isArchived}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {!isArchived && (
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
                )}
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
                          disabled={isArchived}
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
                        {!isArchived && (
                          <button
                            type="button"
                            className="checklist-del-btn"
                            onClick={() => deleteChecklistMutation.mutate(item.id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!isArchived && (
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
                )}
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
                {!isArchived && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newComment.trim() || createCommentMutation.isPending) return;
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
                        placeholder="Viết bình luận hoặc thông báo (Gõ @ để tag thành viên, Enter để gửi)..."
                        value={newComment}
                        onChange={handleCommentChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowMentionDropdown(false);
                          }
                          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            if (showMentionDropdown) {
                              const filtered = members.filter((m) =>
                                mentionFilter
                                  ? m.user.fullName.toLowerCase().includes(mentionFilter)
                                  : true
                              );
                              if (filtered.length > 0) {
                                handleSelectMention(filtered[0].user.fullName);
                                return;
                              }
                              setShowMentionDropdown(false);
                            }
                            if (!newComment.trim() || createCommentMutation.isPending) return;
                            createCommentMutation.mutate(newComment.trim());
                          }
                        }}
                      />

                      <button
                        type="submit"
                        className="comment-submit-btn"
                        disabled={createCommentMutation.isPending || !newComment.trim()}
                        title="Gửi tin (Enter)"
                        aria-label="Gửi tin"
                      >
                        {createCommentMutation.isPending ? (
                          <span className="btn-spinner" />
                        ) : (
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                <div className="comments-stream">
                  {comments.map((c) => {
                    const author = c.user || c.author;
                    const authorAvatar = getMediaUrl(author?.avatarUrl);
                    const authorName = author?.fullName || 'Thành viên';
                    const timeFormatted = formatCommentTimestamp(c.createdAt);

                    return (
                      <div key={c.id} className="comment-item">
                        {authorAvatar ? (
                          <img src={authorAvatar} alt={authorName} className="comment-avatar" />
                        ) : (
                          <div className="comment-avatar">{getInitials(authorName)}</div>
                        )}

                        <div className="comment-body">
                          <div className="comment-meta">
                            <span className="comment-author">{authorName}</span>
                            <span
                              className="comment-time"
                              title={formatDisplayDate(c.createdAt)}
                            >
                              {timeFormatted}
                            </span>
                          </div>
                          <p className="comment-text">{renderCommentWithMentions(c.content)}</p>
                        </div>

                        {!isArchived && (
                          <button
                            type="button"
                            className="comment-del-btn"
                            title="Xóa bình luận"
                            onClick={() => deleteCommentMutation.mutate(c.id)}
                          >
                            ✕
                          </button>
                        )}
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
