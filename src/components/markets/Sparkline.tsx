interface SparklineProps {
  closes: number[];
  previousClose: number;
  width?: number;
  height?: number;
}

export function Sparkline({ closes, previousClose, width = 60, height = 16 }: SparklineProps) {
  if (closes.length < 2) return null;

  const lastClose = closes[closes.length - 1];
  const color = lastClose >= previousClose ? '#22c55e' : '#ef4444';

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1; // avoid division by zero

  const padding = 1;
  const plotHeight = height - padding * 2;

  const points = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * width;
    const y = padding + plotHeight - ((c - min) / range) * plotHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const d = points.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
