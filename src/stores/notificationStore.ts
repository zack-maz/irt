import { create } from 'zustand';
import type { ConflictEventType } from '@/types/ui';
import type { MatchedHeadline } from '@/lib/newsMatching';

export interface Notification {
  id: string;
  eventId: string;
  type: ConflictEventType;
  label: string;
  locationName: string;
  lat: number;
  lng: number;
  timestamp: number;
  score: number; // Severity score (internal sort, not displayed)
  matchedNews: MatchedHeadline[];
}

export interface FlyToTarget {
  lng: number;
  lat: number;
  zoom: number;
}

interface NotificationState {
  notifications: Notification[];
  readIds: Set<string>;
  isDropdownOpen: boolean;
  unreadCount: number;
  flyToTarget: FlyToTarget | null;
  setNotifications: (notifications: Notification[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  setFlyToTarget: (target: FlyToTarget | null) => void;
}

const STORAGE_KEY = 'notificationReadIds';

function loadReadIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const arr = JSON.parse(stored) as string[];
      return new Set(arr);
    }
  } catch {
    /* localStorage unavailable or corrupted JSON */
  }
  return new Set();
}

function persistReadIds(readIds: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds]));
  } catch {
    /* silently fail */
  }
}

const initialReadIds = loadReadIds();

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  readIds: initialReadIds,
  isDropdownOpen: false,
  unreadCount: 0,
  flyToTarget: null,

  setNotifications: (notifications) => {
    const { readIds } = get();
    const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
    set({ notifications, unreadCount });
  },

  markRead: (id) => {
    const { readIds, unreadCount } = get();
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    persistReadIds(next);
    set({ readIds: next, unreadCount: Math.max(0, unreadCount - 1) });
  },

  markAllRead: () => {
    const { notifications, readIds } = get();
    const next = new Set(readIds);
    for (const n of notifications) {
      next.add(n.id);
    }
    persistReadIds(next);
    set({ readIds: next, unreadCount: 0 });
  },

  toggleDropdown: () => set((s) => ({ isDropdownOpen: !s.isDropdownOpen })),

  closeDropdown: () => set({ isDropdownOpen: false }),

  setFlyToTarget: (target) => set({ flyToTarget: target }),
}));
