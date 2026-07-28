import { buildSnapLines, type SnapLine, type SnapRect } from "./snapping";

/** Marks an element as both snappable and a snap target for its peers. */
export const SNAP_TARGET_ATTR = "data-snap-target";

/** Gutter as a fraction of canvas width, matching the screen-gutter padding. */
const GUTTER_RATIO = 0.06;

export function localRect(el: Element, canvas: DOMRect): SnapRect {
  const r = el.getBoundingClientRect();
  return {
    left: r.left - canvas.left,
    top: r.top - canvas.top,
    width: r.width,
    height: r.height,
  };
}

/**
 * Alignment lines for a drag in progress: the canvas centre and gutters plus
 * every other snap-target element currently on the canvas.
 */
export function collectSnapLines(
  canvasEl: HTMLElement | null,
  dragged: Element | null
): SnapLine[] {
  if (!canvasEl) return [];
  const canvas = canvasEl.getBoundingClientRect();

  const peers: SnapRect[] = [];
  for (const el of canvasEl.querySelectorAll(`[${SNAP_TARGET_ATTR}]`)) {
    if (el === dragged || (dragged && el.contains(dragged))) continue;
    const rect = localRect(el, canvas);
    if (rect.width > 0 && rect.height > 0) peers.push(rect);
  }

  return buildSnapLines(
    { width: canvas.width, height: canvas.height },
    canvas.width * GUTTER_RATIO,
    peers
  );
}
