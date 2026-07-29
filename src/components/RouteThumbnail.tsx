/**
 * A small route trace, for use anywhere an activity is summarised — the home
 * screen badges in particular.
 *
 * Shares `fitRoute` with the editor preview and the canvas export, so the
 * shape shown here is the same shape the user ends up sharing.
 */

import type { RouteGeometry } from "../utils/routeGeometry";
import { fitRoute } from "../utils/routeGeometry";

interface RouteThumbnailProps {
  geometry: RouteGeometry;
  /** Edge length of the square the trace is fitted into, in px. */
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function RouteThumbnail({
  geometry,
  size = 40,
  color = "currentColor",
  strokeWidth = 2,
  className,
}: RouteThumbnailProps) {
  // Callers fall back to the activity icon when there is nothing to draw.
  if (geometry.points.length < 2) return null;

  // Inset by the stroke so round caps aren't clipped by the badge's edge.
  const points = fitRoute(geometry, Math.max(1, size - strokeWidth * 2))
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
