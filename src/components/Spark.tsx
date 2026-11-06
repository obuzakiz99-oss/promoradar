/** Tiny APR sparkline (from our 30-min snapshots). Amber when APR fell, lime when it held or rose. */
export function Spark({ points, width = 84, height = 22, title }: { points: number[]; width?: number; height?: number; title?: string }) {
  if (points.length < 2) return null;
  const lo = Math.min(...points), hi = Math.max(...points), span = hi - lo || 1;
  const xy = points.map((v, i) => `${((i / (points.length - 1)) * (width - 2) + 1).toFixed(1)},${(height - 2 - ((v - lo) / span) * (height - 4)).toFixed(1)}`).join(" ");
  const down = points[points.length - 1] < points[0] * 0.97;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mt-1 block" role="img" aria-label={title}>
      {title && <title>{title}</title>}
      <polyline points={xy} fill="none" stroke={down ? "#ffb547" : "#c8ff3d"} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
