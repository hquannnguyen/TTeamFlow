import React, { useState } from 'react';
import type { KanbanColumn, KanbanTask } from '../api/kanban.api';
import { getMediaUrl } from '../../../api/http';

interface KanbanListViewProps {
  columns: KanbanColumn[];
  allColumns: KanbanColumn[];
  projectKey?: string;
  onTaskClick: (task: KanbanTask) => void;
  onMoveTask: (taskId: string, targetColumnId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (columnId: string) => void;
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'URGENT':
      return { text: 'Khẩn cấp', className: 'priority-badge-urgent' };
    case 'HIGH':
      return { text: 'Cao', className: 'priority-badge-high' };
    case 'MEDIUM':
      return { text: 'Trung bình', className: 'priority-badge-medium' };
    case 'LOW':
    default:
      return { text: 'Thấp', className: 'priority-badge-low' };
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
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

export function KanbanListView({
  columns,
  allColumns,
  projectKey = 'TTF',
  onTaskClick,
  onMoveTask,
  onDeleteTask,
  onAddTask,
}: KanbanListViewProps) {
  // Track collapsed column IDs
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});

  const toggleCollapse = (columnId: string) => {
    setCollapsedCols((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const totalTasks = columns.reduce((acc, col) => acc + col.tasks.length, 0);

  if (columns.length === 0 || totalTasks === 0) {
    return (
      <div className="kanban-list-empty-container">
        <div className="kanban-list-empty-icon">📋</div>
        <h3 className="kanban-list-empty-title">Không tìm thấy công việc nào</h3>
        <p className="kanban-list-empty-desc">
          Không có công việc nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm hiện tại.
        </p>
      </div>
    );
  }

  return (
    <div className="kanban-list-view-container">
      {columns.map((column) => {
        const isCollapsed = Boolean(collapsedCols[column.id]);
        const colNameUpper = column.name.toUpperCase();
        const colType =
          column.isCompleted || colNameUpper.includes('DONE') || colNameUpper.includes('XONG')
            ? 'done'
            : colNameUpper.includes('DOING') || colNameUpper.includes('THỰC HIỆN')
            ? 'doing'
            : 'todo';

        return (
          <div key={column.id} className="kanban-list-group">
            {/* Group Header */}
            <div
              className="kanban-list-group-header"
              onClick={() => toggleCollapse(column.id)}
            >
              <div className="kanban-list-group-title-wrap">
                <button
                  type="button"
                  className="kanban-list-collapse-btn"
                  title={isCollapsed ? 'Mở rộng cột' : 'Thu gọn cột'}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <span className={`kanban-col-dot ${colType}`} />
                <span className="kanban-list-group-name">{column.name}</span>
                <span className="kanban-col-count-pill">{column.tasks.length}</span>
              </div>

              <button
                type="button"
                className="kanban-list-add-task-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTask(column.id);
                }}
                title={`Thêm công việc vào ${column.name}`}
              >
                + Thêm việc
              </button>
            </div>

            {/* Table / List Body */}
            {!isCollapsed && (
              <div className="kanban-list-table-wrap">
                <table className="kanban-list-table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Mã</th>
                      <th style={{ minWidth: '240px' }}>Tiêu đề công việc</th>
                      <th style={{ width: '160px' }}>Trạng thái</th>
                      <th style={{ width: '130px' }}>Độ ưu tiên</th>
                      <th style={{ width: '160px' }}>Người thực hiện</th>
                      <th style={{ width: '130px' }}>Hạn chót</th>
                      <th style={{ width: '110px' }}>Tiến độ</th>
                      <th style={{ width: '60px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {column.tasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="kanban-list-empty-row">
                          Chưa có công việc nào trong cột này
                        </td>
                      </tr>
                    ) : (
                      column.tasks.map((task) => {
                        const priorityInfo = getPriorityBadge(task.priority);
                        const formattedDueDate = formatDate(task.dueDate);
                        const late = isOverdue(task.dueDate, column.isCompleted || Boolean(task.completedAt));
                        const taskCode = `${projectKey}-${task.taskNumber || task.position || '1'}`;
                        const checklistCount = task._count?.checklistItems || 0;
                        const commentsCount = task._count?.comments || 0;

                        return (
                          <tr
                            key={task.id}
                            className="kanban-list-row"
                            onClick={() => onTaskClick(task)}
                          >
                            {/* Mã Task */}
                            <td>
                              <span className="kanban-list-task-code">{taskCode}</span>
                            </td>

                            {/* Tiêu đề */}
                            <td>
                              <div className="kanban-list-title-cell">
                                <span className="kanban-list-task-title">{task.title}</span>
                              </div>
                            </td>

                            {/* Cột / Trạng thái (Quick Move) */}
                            <td onClick={(e) => e.stopPropagation()}>
                              <select
                                className="kanban-list-status-select"
                                value={column.id}
                                onChange={(e) => onMoveTask(task.id, e.target.value)}
                              >
                                {allColumns.map((col) => (
                                  <option key={col.id} value={col.id}>
                                    {col.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Độ ưu tiên */}
                            <td>
                              <span className={`kanban-priority-pill ${priorityInfo.className}`}>
                                {priorityInfo.text}
                              </span>
                            </td>

                            {/* Người thực hiện */}
                            <td>
                              <div className="kanban-list-assignees-cell">
                                {task.assignments && task.assignments.length > 0 ? (
                                  task.assignments.map((a) => {
                                    const avatar = getMediaUrl(a.user.avatarUrl);
                                    return (
                                      <div
                                        key={a.user.id}
                                        className="kanban-list-assignee-avatar"
                                        title={a.user.fullName}
                                      >
                                        {avatar ? (
                                          <img src={avatar} alt={a.user.fullName} />
                                        ) : (
                                          <span>{getInitials(a.user.fullName)}</span>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <span className="kanban-list-unassigned">Chưa gán</span>
                                )}
                              </div>
                            </td>

                            {/* Hạn chót */}
                            <td>
                              {formattedDueDate ? (
                                <span className={`kanban-list-date ${late ? 'is-overdue' : ''}`}>
                                  {formattedDueDate}
                                  {late && <span className="overdue-tag">Quá hạn</span>}
                                </span>
                              ) : (
                                <span className="kanban-list-no-date">—</span>
                              )}
                            </td>

                            {/* Checklist & Comments */}
                            <td>
                              <div className="kanban-list-meta-cell">
                                {checklistCount > 0 && (
                                  <span className="kanban-list-meta-item" title={`${checklistCount} mục con`}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="9 11 12 14 22 4" />
                                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                    </svg>
                                    {checklistCount}
                                  </span>
                                )}
                                {commentsCount > 0 && (
                                  <span className="kanban-list-meta-item" title={`${commentsCount} bình luận`}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    {commentsCount}
                                  </span>
                                )}
                                {checklistCount === 0 && commentsCount === 0 && (
                                  <span className="kanban-list-no-date">—</span>
                                )}
                              </div>
                            </td>

                            {/* Thao tác (Delete) */}
                            <td onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="kanban-list-delete-btn"
                                title="Xóa nhiệm vụ"
                                onClick={() => {
                                  if (window.confirm(`Bạn có chắc chắn muốn xóa "${task.title}"?`)) {
                                    onDeleteTask(task.id);
                                  }
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
