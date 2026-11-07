import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../features/auth/store/auth.store';
import { broadcastNotificationUpdate } from '../features/notifications/utils/broadcast.util';

/**
 * Kết nối WebSocket nhận thông báo real-time (Socket.IO).
 * - Connect sau khi đăng nhập (có Access Token), disconnect khi đăng xuất.
 * - Nhận "notification:new" (1 thông báo mới) và "notifications:invalidate"
 *   (tín hiệu làm mới danh sách) → làm mới TanStack Query cache.
 * - Thông báo vẫn được server ghi DB trước → mất kết nối không mất thông báo,
 *   reconnect xong query tự refetch.
 */

let socket: Socket | null = null;

/** Origin của backend: dev đi qua Vite proxy (cùng origin), prod qua Nginx */
function backendOrigin(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // VITE_API_URL dạng http://host/api/v1 → lấy phần gốc
    return apiUrl.replace(/\/api\/v1\/?$/, '') || window.location.origin;
  }
  return window.location.origin;
}

export function connectNotificationSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  if (socket?.connected) return socket;

  disconnectNotificationSocket();

  socket = io(backendOrigin(), {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'], // websocket trước, tự fallback polling
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  });

  socket.on('connect', () => {
    // Kết nối lại sau khi offline: làm mới toàn bộ dữ liệu thông báo
    broadcastNotificationUpdate();
  });

  socket.on('notification:new', () => {
    broadcastNotificationUpdate();
  });

  socket.on('notifications:invalidate', () => {
    broadcastNotificationUpdate();
  });

  return socket;
}

export function disconnectNotificationSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getNotificationSocket(): Socket | null {
  return socket;
}
