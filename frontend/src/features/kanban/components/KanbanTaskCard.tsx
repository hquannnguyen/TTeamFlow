import React from 'react';
import type { KanbanTask } from '../api/kanban.api';
import { getMediaUrl } from '../../../api/http';

interface KanbanTaskCardProps {
  task: KanbanTask;
  projectKey?: string;
  isCompletedColumn?: boolean;
  onMoveToColumn?: (targetColumnId: string) => void;
  availableColumns?: Array<{ id: string; name: string }>;
  currentColumnId?: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

function getPriorityLabel(priority: string) {
  switch (priority) {
    case 'URGENT':
    case 'HIGH':
      return { text: 'Cao', className: 'high' };
    case 'MEDIUM':
      return { text: 'Trung bình', className: 'medium' };
    case 'LOW':
    default:
      return { text: 'Thấp', className: 'low' };
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return `${day} Th${month}`;
}

function isOverdue(dateStr?: string | null, isCompleted?: boolean) {
  if (!dateStr || isCompleted) return false;
  const d = new Date(dateStr);
  return d.getTime() < Date.now();
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function KanbanTaskCard({
  task,
  projectKey = 'TTF',
  isCompletedColumn = false,
  onMoveToColumn,
  availableColumns = [],
  currentColumnId,
  onClick,
  onDragStart,
  onDragEnd,
}: KanbanTaskCardProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const priorityInfo = getPriorityLabel(task.priority);
  const formattedDueDate = formatDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, isCompletedColumn || Boolean(task.completedAt));
  const isDone = isCompletedColumn || Boolean(task.completedAt);

  // Key representation like Stitch: TTF-104
  const taskCode = `${projectKey}-${task.taskNumber || (task.position > 0 ? Math.floor(task.position / 100) : 1)}`;

  // First assignee
  const firstAssignee = task.assignments && task.assignments.length > 0 ? task.assignments[0].user : null;
  const avatarUrl = getMediaUrl(firstAssignee?.avatarUrl);

  // Checklists or comment counts
  const checklistTotal = task._count?.checklistItems ?? 0;
  const hasProgress = checklistTotal > 0;

  // Next and Previous columns for quick navigation
  const currentIndex = availableColumns.findIndex((c) => c.id === currentColumnId);
  const prevColumn = currentIndex > 0 ? availableColumns[currentIndex - 1] : null;
  const nextColumn = currentIndex >= 0 && currentIndex < availableColumns.length - 1 ? availableColumns[currentIndex + 1] : null;

  return (
    <div
      className={`stitch-task-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, columnId: task.columnId }));
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
        onDragStart?.(e);
      }}
      onDragEnd={(e) => {
        setIsDragging(false);
        onDragEnd?.(e);
      }}
      onClick={onClick}
    >
      {/* Top Row: Task Key & Priority */}
      <div className="stitch-card-top-row">
        <span className={`stitch-task-key-tag ${isDone ? 'completed' : ''}`}>
          {taskCode}
        </span>
        <span className={`stitch-priority-badge ${priorityInfo.className}`}>
          {priorityInfo.text}
        </span>
      </div>

      {/* Title */}
      <h3 className={`stitch-task-title ${isDone ? 'completed' : ''}`}>
        {task.title}
      </h3>

      {/* Progress / Checklist */}
      {hasProgress && (
        <div className="stitch-progress-section">
          <div className="stitch-progress-info">
            <span>Danh sách kiểm tra</span>
            <span>{isDone ? `${checklistTotal}/${checklistTotal}` : `1/${checklistTotal}`}</span>
          </div>
          <div className="stitch-progress-track">
            <div
              className="stitch-progress-fill"
              style={{ width: `${isDone ? 100 : Math.round((1 / checklistTotal) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Row: Due Date or Done status + Assignee */}
      <div className="stitch-card-bottom-row">
        {isDone ? (
          <span className="stitch-due-date-pill done">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Đã xong
          </span>
        ) : formattedDueDate ? (
          <span className={`stitch-due-date-pill ${overdue ? 'urgent' : ''}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formattedDueDate}
          </span>
        ) : (
          <span className="stitch-due-date-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            Không hạn
          </span>
        )}

        {/* Assignee Avatar */}
        {firstAssignee ? (
          avatarUrl ? (
            <img
              src={avatarUrl}
              alt={firstAssignee.fullName}
              className="stitch-card-assignee-avatar"
              title={firstAssignee.fullName}
            />
          ) : (
            <div
              className="stitch-card-assignee-avatar"
              title={firstAssignee.fullName}
            >
              {getInitials(firstAssignee.fullName)}
            </div>
          )
        ) : (
          <div className="stitch-card-assignee-avatar" title="Chưa phân công">
            ?
          </div>
        )}
      </div>

      {/* Quick Move Row */}
      {onMoveToColumn && (prevColumn || nextColumn) && (
        <div
          className="stitch-card-actions-row"
          onClick={(e) => e.stopPropagation()}
        >
          {prevColumn && (
            <button
              type="button"
              className="stitch-quick-move-btn"
              onClick={() => onMoveToColumn(prevColumn.id)}
              title={`Chuyển về "${prevColumn.name}"`}
            >
              ← {prevColumn.name}
            </button>
          )}
          {nextColumn && (
            <button
              type="button"
              className="stitch-quick-move-btn"
              onClick={() => onMoveToColumn(nextColumn.id)}
              title={`Chuyển sang "${nextColumn.name}"`}
            >
              {nextColumn.name} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
