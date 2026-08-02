/**
 * Converting a template's route slot into a user-owned route overlay.
 *
 * The template anchors the route by percentage from the canvas's top-left; an
 * overlay is offset in preview pixels from the canvas centre. Two coordinate
 * systems describing one path is exactly the drift this module exists to
 * collapse: promotion happens once, on the first drag, after which the overlay
 * is the only route on the canvas.
 */

import type { ChartStyle, RouteGeometry, RouteOverlay, SlotPosition } from "../types";

/** Must match REFERENCE_WIDTH in StatLayer.tsx and drawStatLayer.ts. */
const REFERENCE_WIDTH = 390;

/** Fallbacks matching route_trace's own, so promotion changes nothing visually. */
const DEFAULT_STROKE = 3;

export interface RoutePromotion {
  geometry: RouteGeometry;
  style: ChartStyle;
  /** The slot's percentage anchor, top-left. */
  pos: SlotPosition;
  canvas: { width: number; height: number };
}

export function promoteRouteSlot({
  geometry,
  style,
  pos,
  canvas,
}: RoutePromotion): RouteOverlay {
  const scale = canvas.width / REFERENCE_WIDTH;
  const boxW = style.width * scale;
  const boxH = style.height * scale;

  // Percentage anchor -> pixels, top-left -> box centre, then measured from
  // the canvas centre, which is what every overlay on the canvas uses.
  const leftPx = (pos.x / 100) * canvas.width;
  const topPx = (pos.y / 100) * canvas.height;

  return {
    id: `route_${Date.now()}`,
    geometry,
    x: leftPx + boxW / 2 - canvas.width / 2,
    y: topPx + boxH / 2 - canvas.height / 2,
    // route_trace fits the shorter edge, and fitRoute sizes the longest edge
    // of the path — so the overlay's size is the box's shorter edge.
    size: Math.min(boxW, boxH),
    color: style.color,
    strokeWidth: style.strokeWidth ?? DEFAULT_STROKE,
    opacity: style.opacity ?? 1,
    scale: 1,
    rotation: style.rotation ?? 0,
    zIndex: 40,
  };
}
