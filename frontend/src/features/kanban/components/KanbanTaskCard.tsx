import React, { useState } from 'react';
import type { KanbanTask } from '../api/kanban.api';
import { getMediaUrl } from '../../../api/http';

interface KanbanTaskCardProps {
  task: KanbanTask;
  projectKey?: string;
  isCompletedColumn?: boolean;
  onClick?: () => void;
  onDeleteTask?: (taskId: string) => void;
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
  onClick,
  onDeleteTask,
  onDragStart,
  onDragEnd,
}: KanbanTaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
      {/* Top Row: Task Key & Three-dots Menu */}
      <div className="stitch-card-top-row">
        <span className={`stitch-task-key-tag ${isDone ? 'completed' : ''}`}>
          {taskCode}
        </span>

        {/* Three dots menu button */}
        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="stitch-card-menu-btn"
            onClick={() => setShowMenu((prev) => !prev)}
            title="Tùy chọn nhiệm vụ"
          >
            •••
          </button>

          {showMenu && (
            <div className="stitch-card-dropdown-menu">
              <button
                type="button"
                className="stitch-card-dropdown-item text-danger"
                onClick={() => {
                  setShowMenu(false);
                  onDeleteTask?.(task.id);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                <span>Xóa nhiệm vụ</span>
              </button>
            </div>
          )}
        </div>
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

      {/* Bottom Row: Due Date + Priority Badge + Assignee Avatar */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Priority label moved to bottom row */}
          <span className={`stitch-priority-badge ${priorityInfo.className}`}>
            {priorityInfo.text}
          </span>

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
      </div>
    </div>
  );
}
