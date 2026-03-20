import { useEffect } from 'react';
import { useEventStore } from '@/stores/eventStore';
import { useNewsStore } from '@/stores/newsStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { computeSeverityScore } from '@/lib/severity';
import { matchNewsToEvent } from '@/lib/newsMatching';
import type { Notification } from '@/stores/notificationStore';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Derives notifications from eventStore + newsStore.
 * Scores each event, matches news, and pushes into notificationStore.
 * Call once in AppShell alongside other polling hooks.
 */
export function useNotifications(): void {
  const events = useEventStore((s) => s.events);
  const clusters = useNewsStore((s) => s.clusters);
  const setNotifications = useNotificationStore((s) => s.setNotifications);

  useEffect(() => {
    const cutoff = Date.now() - WEEK_MS;
    const recentEvents = events.filter((e) => e.timestamp >= cutoff);

    const notifications: Notification[] = recentEvents.map((event) => ({
      id: event.id,
      eventId: event.id,
      type: event.type,
      label: event.label,
      locationName: event.data.locationName,
      lat: event.lat,
      lng: event.lng,
      timestamp: event.timestamp,
      score: computeSeverityScore(event),
      matchedNews: matchNewsToEvent(event, clusters),
    }));

    // Sort by score descending (time grouping happens in UI)
    notifications.sort((a, b) => b.score - a.score);

    setNotifications(notifications);
  }, [events, clusters, setNotifications]);
}
