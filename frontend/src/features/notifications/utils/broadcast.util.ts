/**
 * Broadcasts notification changes across all open browser tabs/windows
 * so unread badge and dropdown update instantly without waiting for poll interval.
 */
export function broadcastNotificationUpdate() {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('tteamflow_notifications');
      channel.postMessage('REFRESH');
      channel.close();
    } catch {
      // ignore in environments without BroadcastChannel
    }
  }
}
