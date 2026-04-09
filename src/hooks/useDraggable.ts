import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface DraggableOptions {
  storageKey: string;
  defaultPosition: Position;
  bounds?: Bounds;
}

interface DraggableReturn {
  position: Position;
  isDragging: boolean;
  handleProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    style: { touchAction: 'none'; cursor: 'grab' | 'grabbing' };
  };
  resetPosition: () => void;
}

/** Pure helper: clamp position to bounds */
export function clampPosition(pos: Position, bounds: Bounds): Position {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, pos.y)),
  };
}

function loadPosition(key: string, fallback: Position): Position {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function savePosition(key: string, pos: Position): void {
  try {
    localStorage.setItem(key, JSON.stringify(pos));
  } catch {
    // localStorage unavailable
  }
}

function removePosition(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage unavailable
  }
}

export function useDraggable(options: DraggableOptions): DraggableReturn {
  const { storageKey, defaultPosition, bounds } = options;

  const [position, setPosition] = useState<Position>(() =>
    loadPosition(storageKey, defaultPosition),
  );
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  const getEffectiveBounds = useCallback((): Bounds => {
    if (bounds) return bounds;
    // Default: viewport bounds with 48px topbar clearance and some bottom margin
    return {
      minX: 0,
      minY: 48,
      maxX: (typeof window !== 'undefined' ? window.innerWidth : 1920) - 100,
      maxY: (typeof window !== 'undefined' ? window.innerHeight : 1080) - 100,
    };
  }, [bounds]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
      setIsDragging(true);
    },
    [position],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const raw = {
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      };
      const clamped = clampPosition(raw, getEffectiveBounds());
      setPosition(clamped);
    },
    [getEffectiveBounds],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      dragStartRef.current = null;
      setIsDragging(false);
      // Persist after drag ends
      setPosition((current) => {
        savePosition(storageKey, current);
        return current;
      });
    },
    [storageKey],
  );

  const resetPosition = useCallback(() => {
    setPosition(defaultPosition);
    removePosition(storageKey);
  }, [defaultPosition, storageKey]);

  // Re-clamp on window resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev, getEffectiveBounds()));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getEffectiveBounds]);

  return {
    position,
    isDragging,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      style: {
        touchAction: 'none' as const,
        cursor: isDragging ? ('grabbing' as const) : ('grab' as const),
      },
    },
    resetPosition,
  };
}
