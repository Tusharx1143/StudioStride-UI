/**
 * Canvas renderer for a route overlay, used by the export pass.
 *
 * Shares `fitRoute` with the SVG preview, so the only difference between what
 * the editor shows and what the export writes is the scale multiplier.
 */

import type { RouteOverlay } from "../types";
import { fitRoute } from "./routeGeometry";

export interface ExportFrame {
  /** Editor preview size, which overlay coordinates are relative to. */
  containerWidth: number;
  containerHeight: number;
  /** Export canvas size / preview size. */
  scaleX: number;
  scaleY: number;
}

/** Thinnest stroke that survives downscaling on a share image. */
const MIN_STROKE = 2;

export function drawRouteLayer(
  ctx: CanvasRenderingContext2D,
  overlay: RouteOverlay,
  frame: ExportFrame
): void {
  if (overlay.hidden) return;
  if (overlay.geometry.points.length < 2) return;

  const points = fitRoute(
    overlay.geometry,
    overlay.size * (overlay.scale ?? 1) * frame.scaleX
  );

  const posX = (frame.containerWidth / 2 + overlay.x) * frame.scaleX;
  const posY = (frame.containerHeight / 2 + overlay.y) * frame.scaleY;

  ctx.save();

  ctx.translate(posX, posY);
  if (overlay.rotation) {
    ctx.rotate((overlay.rotation * Math.PI) / 180);
  }

  ctx.globalAlpha = overlay.opacity;
  ctx.strokeStyle = overlay.color;
  ctx.lineWidth = Math.max(MIN_STROKE, overlay.strokeWidth * frame.scaleX);
  // Round joins matter: a GPS trace changes direction hundreds of times, and
  // mitre joins spike into visible spurs at every switchback.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();

  ctx.restore();
}
