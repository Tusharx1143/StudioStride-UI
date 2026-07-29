/**
 * SVG preview of a route overlay.
 *
 * Shares `fitRoute` with the canvas export pass, so what the editor shows and
 * what the export writes cannot drift — only the scale differs.
 */

import type { RouteOverlay } from "../../types";
import { fitRoute } from "../../utils/routeGeometry";

/** Touch target width for the route, independent of how thin it's drawn. */
const HIT_STROKE_WIDTH = 24;

interface RouteLayerProps {
  overlay: RouteOverlay;
}

export function RouteLayer({ overlay }: RouteLayerProps) {
  if (overlay.hidden) return null;
  if (overlay.geometry.points.length < 2) return null;

  const size = overlay.size;
  const points = fitRoute(overlay.geometry, size)
    .map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`)
    .join(" ");

  return (
    <svg
      width={size}
      height={size}
      // fitRoute centres on the origin, so the viewBox is centred too.
      viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
      // A stroke on the outermost point would otherwise clip at the edge.
      overflow="visible"
      style={{ pointerEvents: "none", display: "block" }}
    >
      {/* Invisible hit path. The layer's box is a large mostly-empty square;
          without this, taps anywhere inside it count as taps on the route and
          the photo underneath becomes unreachable. Widened well past the
          visible stroke so a fingertip can actually land on it. */}
      <polyline
        points={points}
        fill="none"
        stroke="rgba(0,0,0,0)"
        strokeWidth={HIT_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: "stroke" }}
      />
      <polyline
        points={points}
        fill="none"
        stroke={overlay.color}
        strokeWidth={overlay.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={overlay.opacity}
        style={{ pointerEvents: "none" }}
      />
    </svg>
  );
}
