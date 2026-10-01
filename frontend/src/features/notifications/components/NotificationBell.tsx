import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api/notifications.api';
import type { NotificationItemData } from '../types/notification.types';
import { NotificationItem } from './NotificationItem';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Unread count query (polling every 30s)
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => getUnreadNotificationCount(),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const unreadCount =
    typeof unreadData?.unreadCount === 'number'
      ? unreadData.unreadCount
      : typeof (unreadData as { data?: { unreadCount?: number } })?.data?.unreadCount === 'number'
        ? (unreadData as { data?: { unreadCount?: number } }).data!.unreadCount!
        : 0;

  // 2. Notifications list query
  const { data: notifResponse, isLoading } = useQuery({
    queryKey: ['notifications', { unreadOnly: activeTab === 'unread' }],
    queryFn: () => getNotifications({ unreadOnly: activeTab === 'unread', limit: 20 }),
    enabled: isOpen,
  });

  const notifications: NotificationItemData[] = Array.isArray(notifResponse)
    ? notifResponse
    : Array.isArray(notifResponse?.data)
      ? notifResponse.data
      : [];

  // 3. Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 4. Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Click outside & Escape listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (item: NotificationItemData) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
    setIsOpen(false);

    // Deep navigation
    if (item.taskId && item.projectId) {
      navigate(`/projects/${item.projectId}/board?taskId=${item.taskId}`);
    } else if (item.projectId) {
      navigate(`/projects/${item.projectId}/board`);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="notif-bell-container" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        className={`top-icon-btn with-badge ${isOpen ? 'active' : ''}`}
        title="Thông báo"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notif-badge-count">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="notif-dropdown-menu">
          {/* Header */}
          <div className="notif-dropdown-header">
            <div className="notif-header-title-row">
              <span className="notif-header-title">Thông báo</span>
              {unreadCount > 0 && (
                <span className="notif-header-unread-tag">{unreadCount} mới</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-all-btn"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                title="Đánh dấu tất cả là đã đọc"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="20 6 9 17 4 12" />
                  <polyline points="15 6 9 12 7 10" />
                </svg>
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="notif-filter-tabs">
            <button
              type="button"
              className={`notif-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`notif-tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* List Content */}
          <div className="notif-dropdown-body">
            {isLoading ? (
              <div className="notif-loading-state">
                <div className="spinner-ring-sm" />
                <span>Đang tải thông báo...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="notif-empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="notif-empty-title">
                  {activeTab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                </p>
                <p className="notif-empty-desc">
                  Các thông tin cập nhật về nhiệm vụ và dự án sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <div className="notif-items-list">
                {notifications.map((item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                    onClick={handleItemClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
