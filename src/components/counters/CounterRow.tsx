import { useEffect, useRef, useState } from 'react';

interface CounterRowProps {
  label: string;
  filtered: number;
  total: number;
  showRatio: boolean;
  color?: string;
}

const fmt = new Intl.NumberFormat('en-US');

export function CounterRow({ label, filtered, total, showRatio, color }: CounterRowProps) {
  // Track the "primary" value for delta detection
  const primaryValue = showRatio ? filtered : total;
  const prevRef = useRef<number>(primaryValue);
  const [delta, setDelta] = useState<number | null>(null);
  const [deltaKey, setDeltaKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevRef.current !== primaryValue) {
      const diff = primaryValue - prevRef.current;
      setDelta(diff);
      setDeltaKey((k) => k + 1);
      prevRef.current = primaryValue;

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setDelta(null);
        timeoutRef.current = null;
      }, 3000);
    }

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [primaryValue]);

  // Value display logic
  let valueDisplay: string;
  if (showRatio && filtered !== total) {
    const pct = total > 0 ? Math.round((filtered / total) * 100) : 0;
    valueDisplay = `${fmt.format(filtered)}/${fmt.format(total)}  ${pct}%`;
  } else {
    valueDisplay = fmt.format(total);
  }

  const deltaText =
    delta !== null
      ? delta > 0
        ? `+${fmt.format(delta)}`
        : fmt.format(delta)
      : null;

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5">
        {color && (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-text-secondary">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="tabular-nums text-text-primary">{valueDisplay}</span>
        {deltaText && (
          <span
            key={deltaKey}
            className="text-accent-green text-[10px] tabular-nums animate-delta"
          >
            {deltaText}
          </span>
        )}
      </div>
    </div>
  );
}
