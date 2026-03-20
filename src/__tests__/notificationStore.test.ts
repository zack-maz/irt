import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Notification } from '@/stores/notificationStore';
import type { ConflictEventType } from '@/types/ui';

// Mock localStorage
const storage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
});

function makeNotification(id: string, overrides: Partial<Notification> = {}): Notification {
  return {
    id,
    eventId: id,
    type: 'airstrike' as ConflictEventType,
    label: `Event ${id}`,
    locationName: 'Tehran, Iran',
    lat: 35.69,
    lng: 51.39,
    timestamp: Date.now(),
    score: 10,
    matchedNews: [],
    ...overrides,
  };
}

describe('notificationStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    const store = useNotificationStore.getState();
    store.setNotifications([]);
    // Clear readIds by setting new empty ones
    useNotificationStore.setState({ readIds: new Set(), unreadCount: 0, isDropdownOpen: false, flyToTarget: null });
    // Clear localStorage
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  it('setNotifications updates notifications and computes correct unreadCount', () => {
    const notifications = [makeNotification('e1'), makeNotification('e2'), makeNotification('e3')];
    useNotificationStore.getState().setNotifications(notifications);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(3);
    expect(state.unreadCount).toBe(3);
  });

  it('markRead adds id to readIds and decrements count', () => {
    const notifications = [makeNotification('e1'), makeNotification('e2')];
    useNotificationStore.getState().setNotifications(notifications);

    useNotificationStore.getState().markRead('e1');

    const state = useNotificationStore.getState();
    expect(state.readIds.has('e1')).toBe(true);
    expect(state.unreadCount).toBe(1);
  });

  it('markRead persists to localStorage', () => {
    const notifications = [makeNotification('e1')];
    useNotificationStore.getState().setNotifications(notifications);

    useNotificationStore.getState().markRead('e1');

    const stored = JSON.parse(storage['notificationReadIds']);
    expect(stored).toContain('e1');
  });

  it('markRead is idempotent (does not double-decrement)', () => {
    const notifications = [makeNotification('e1'), makeNotification('e2')];
    useNotificationStore.getState().setNotifications(notifications);

    useNotificationStore.getState().markRead('e1');
    useNotificationStore.getState().markRead('e1'); // second call

    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it('markAllRead sets unreadCount to 0 and persists', () => {
    const notifications = [makeNotification('e1'), makeNotification('e2'), makeNotification('e3')];
    useNotificationStore.getState().setNotifications(notifications);

    useNotificationStore.getState().markAllRead();

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.readIds.has('e1')).toBe(true);
    expect(state.readIds.has('e2')).toBe(true);
    expect(state.readIds.has('e3')).toBe(true);

    const stored = JSON.parse(storage['notificationReadIds']);
    expect(stored).toContain('e1');
    expect(stored).toContain('e2');
    expect(stored).toContain('e3');
  });

  it('readIds survive setNotifications (stale read state)', () => {
    const notifications = [makeNotification('e1'), makeNotification('e2')];
    useNotificationStore.getState().setNotifications(notifications);
    useNotificationStore.getState().markRead('e1');

    // Simulate a poll cycle delivering the same events again
    useNotificationStore.getState().setNotifications(notifications);

    const state = useNotificationStore.getState();
    expect(state.readIds.has('e1')).toBe(true);
    expect(state.unreadCount).toBe(1); // only e2 is unread
  });

  it('toggleDropdown toggles isDropdownOpen', () => {
    expect(useNotificationStore.getState().isDropdownOpen).toBe(false);

    useNotificationStore.getState().toggleDropdown();
    expect(useNotificationStore.getState().isDropdownOpen).toBe(true);

    useNotificationStore.getState().toggleDropdown();
    expect(useNotificationStore.getState().isDropdownOpen).toBe(false);
  });

  it('closeDropdown sets isDropdownOpen to false', () => {
    useNotificationStore.getState().toggleDropdown(); // open
    useNotificationStore.getState().closeDropdown();
    expect(useNotificationStore.getState().isDropdownOpen).toBe(false);
  });

  it('setFlyToTarget sets and clears the target', () => {
    const target = { lng: 51.39, lat: 35.69, zoom: 10 };

    useNotificationStore.getState().setFlyToTarget(target);
    expect(useNotificationStore.getState().flyToTarget).toEqual(target);

    useNotificationStore.getState().setFlyToTarget(null);
    expect(useNotificationStore.getState().flyToTarget).toBeNull();
  });
});
