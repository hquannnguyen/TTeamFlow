import React from 'react';
import type { NotificationItemData, NotificationType } from '../types/notification.types';
import { formatRelativeTime } from '../utils/notification-time.util';
import { getMediaUrl } from '../../../api/http';

interface NotificationItemProps {
  item: NotificationItemData;
  onClick: (item: NotificationItemData) => void;
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'TASK_ASSIGNED':
      return (
        <span className="notif-type-badge bg-blue" title="Phân công">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
        </span>
      );
    case 'TASK_MENTIONED':
      return (
        <span className="notif-type-badge bg-amber" title="Nhắc đến">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
          </svg>
        </span>
      );
    case 'TASK_COMMENTED':
      return (
        <span className="notif-type-badge bg-cyan" title="Bình luận">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
      );
    case 'TASK_STATUS_CHANGED':
      return (
        <span className="notif-type-badge bg-green" title="Trạng thái">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      );
    case 'TASK_DUE_DATE_CHANGED':
      return (
        <span className="notif-type-badge bg-red" title="Thời hạn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
      );
    case 'PROJECT_INVITED':
      return (
        <span className="notif-type-badge bg-purple" title="Dự án">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="notif-type-badge bg-gray">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
      );
  }
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ item, onClick }) => {
  const actorAvatar = getMediaUrl(item.actor?.avatarUrl);
  const actorName = item.actor?.fullName || 'Hệ thống';

  return (
    <div
      className={`notif-item ${!item.isRead ? 'unread' : ''}`}
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
    >
      <div className="notif-avatar-wrap">
        {actorAvatar ? (
          <img src={actorAvatar} alt={actorName} className="notif-avatar-img" />
        ) : (
          <div className="notif-avatar-fallback">{getInitials(actorName)}</div>
        )}
        {getTypeIcon(item.type)}
      </div>

      <div className="notif-content-wrap">
        <div className="notif-item-header">
          <span className="notif-item-title">{item.title}</span>
          <span className="notif-item-time">{formatRelativeTime(item.createdAt)}</span>
        </div>
        <p className="notif-item-desc">{item.content}</p>
      </div>

      {!item.isRead && <span className="notif-unread-dot" title="Chưa đọc" />}
    </div>
  );
};
