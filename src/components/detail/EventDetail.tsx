import { useState } from 'react';
import type { ConflictEventEntity } from '@/types/entities';
import { EVENT_TYPE_LABELS } from '@/types/ui';
import { useSiteImage } from '@/hooks/useSiteImage';
import { DetailValue } from './DetailValue';

interface EventDetailProps {
  entity: ConflictEventEntity;
}

export function EventDetail({ entity }: EventDetailProps) {
  const d = entity.data;
  const date = new Date(entity.timestamp).toISOString().slice(0, 10);
  const typeLabel = EVENT_TYPE_LABELS[entity.type] ?? entity.type;
  const imageUrl = useSiteImage(entity.lat, entity.lng);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      {/* Satellite thumbnail */}
      {!imgError && (
        <div className="relative -mx-3 -mt-1 mb-2 overflow-hidden rounded-b-lg">
          <img
            src={imageUrl}
            alt={d.locationName || 'Event location'}
            onError={() => setImgError(true)}
            className="h-36 w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--color-surface-overlay)] to-transparent" />
        </div>
      )}

      <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-1 mt-0">Event</h3>
      <DetailValue label="Type" value={typeLabel} />
      <DetailValue label="Event Type" value={d.eventType || '--'} />
      <DetailValue label="Sub-Type" value={d.subEventType || '--'} />
      <DetailValue label="CAMEO Code" value={d.cameoCode || '--'} />
      <DetailValue
        label="Goldstein"
        value={d.goldsteinScale != null ? String(d.goldsteinScale) : '--'}
      />

      <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-1 mt-3">Location</h3>
      {d.actionGeoType != null && d.actionGeoType <= 2 && (
        <div className="mb-1.5 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[10px] text-amber-400">
          Approximate location — based on {d.actionGeoType === 1 ? 'country' : 'state/region'}{' '}
          coordinates, not a precise geolocation
        </div>
      )}
      <DetailValue label="Location" value={d.locationName || '--'} />
      <DetailValue label="Latitude" value={entity.lat.toFixed(6)} />
      <DetailValue label="Longitude" value={entity.lng.toFixed(6)} />

      <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-1 mt-3">Actors</h3>
      <DetailValue label="Actor 1" value={d.actor1 || '--'} />
      <DetailValue label="Actor 2" value={d.actor2 || '--'} />

      <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-1 mt-3">Source</h3>
      <DetailValue label="Data Source" value="GDELT v2" />
      <DetailValue label="Date" value={date} />
      {d.source && (
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Article</span>
          <a
            href={d.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline"
          >
            View source
          </a>
        </div>
      )}

      {import.meta.env.DEV && d.confidence != null && (
        <div className="mt-2 border-t border-white/5 pt-2">
          <DetailValue label="Confidence" value={d.confidence.toFixed(3)} />
          {d.geoPrecision && <DetailValue label="Geo Precision" value={d.geoPrecision} />}
        </div>
      )}
    </div>
  );
}
