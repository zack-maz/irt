import { useNotificationStore } from '@/stores/notificationStore';
import { useUIStore } from '@/stores/uiStore';
import { EVENT_TYPE_LABELS } from '@/types/ui';
import type { Notification } from '@/stores/notificationStore';

/** Event type icon paths (small inline SVGs). */
const EVENT_ICONS: Record<string, React.ReactNode> = {
  airstrike: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor">
      <path d="M8 1l2 4 4.5.7-3.3 3.1.8 4.5L8 11.3 3.9 13.3l.8-4.5L1.5 5.7 6 5z" />
    </svg>
  ),
  ground_combat: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor">
      <circle cx="8" cy="8" r="6" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor">
      <rect x="3" y="3" width="10" height="10" rx="2" />
    </svg>
  ),
};

function getEventIcon(type: string): React.ReactNode {
  return EVENT_ICONS[type] ?? EVENT_ICONS['default'];
}

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
  const setFlyToTarget = useNotificationStore((s) => s.setFlyToTarget);
  const selectEntity = useUIStore((s) => s.selectEntity);
  const openDetailPanel = useUIStore((s) => s.openDetailPanel);

  const isRead = readIds.has(notification.id);

  const handleClick = () => {
    markRead(notification.id);
    closeDropdown();
    selectEntity(notification.eventId);
    openDetailPanel();
    setFlyToTarget({ lng: notification.lng, lat: notification.lat, zoom: 10 });
  };

  const typeLabel = EVENT_TYPE_LABELS[notification.type] ?? notification.type;
  const newsCount = notification.matchedNews.length;

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-3 py-2 border-b border-border/50 hover:bg-white/5 cursor-pointer transition-colors ${isRead ? 'opacity-50' : ''}`}
      data-testid={`notification-card-${notification.id}`}
    >
      {/* Row 1: icon + type label + relative time */}
      <div className="flex items-center gap-1.5">
        <span className="text-accent-red">{getEventIcon(notification.type)}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {typeLabel}
        </span>
        <span className="ml-auto text-[10px] text-text-muted">
          {formatRelativeTime(notification.timestamp)}
        </span>
      </div>

      {/* Row 2: location + coordinates */}
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-[11px] text-text-primary truncate">
          {notification.locationName || 'Unknown location'}
        </span>
        <span className="shrink-0 text-[10px] text-text-muted">
          {notification.lat.toFixed(2)}, {notification.lng.toFixed(2)}
        </span>
      </div>

      {/* Row 3: matched news headlines (0-3) */}
      {newsCount > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {notification.matchedNews.map((headline, i) => (
            <div key={i} className="text-[10px] text-text-muted truncate">
              <span className="font-medium">{headline.source}:</span>{' '}
              {truncate(headline.title, 60)}
            </div>
          ))}
          <div className="text-[10px] text-accent-blue">
            {newsCount} {newsCount === 1 ? 'source' : 'sources'} reporting
          </div>
        </div>
      )}
    </button>
  );
}
