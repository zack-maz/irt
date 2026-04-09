import { useNotificationStore } from '@/stores/notificationStore';
import type { Notification } from '@/stores/notificationStore';

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}

interface NotificationCardProps {
  notification: Notification;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const readIds = useNotificationStore((s) => s.readIds);
  const markRead = useNotificationStore((s) => s.markRead);
  const closeDropdown = useNotificationStore((s) => s.closeDropdown);

  const isRead = readIds.has(notification.id);

  const handleClick = () => {
    markRead(notification.id);
    closeDropdown();
    window.open(notification.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-3 py-2 border-b border-border/50 hover:bg-white/5 cursor-pointer transition-colors ${isRead ? 'opacity-50' : ''}`}
      data-testid={`notification-card-${notification.id}`}
    >
      {/* Row 1: source + relative time */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {notification.source}
        </span>
        <span className="ml-auto text-[10px] text-text-muted">
          {formatRelativeTime(notification.timestamp)}
        </span>
      </div>

      {/* Row 2: headline */}
      <div className="mt-0.5">
        <span className="text-[11px] text-text-primary leading-snug">
          {truncate(notification.title, 100)}
        </span>
      </div>

      {/* Row 3: source count */}
      {notification.sourceCount > 1 && (
        <div className="mt-1 text-[10px] text-accent-blue">
          {notification.sourceCount} {notification.sourceCount === 1 ? 'source' : 'sources'}{' '}
          reporting
        </div>
      )}
    </button>
  );
}
