/**
 * Pure math for multi-touch layer transforms.
 *
 * Kept free of DOM and React so the gesture behaviour can be tested directly:
 * the component's job is only to feed it pointer positions and push the result
 * into motion values.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

/** Bounds that stop a stray pinch shrinking a layer to nothing or filling the canvas. */
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 6;

/** Below this, two pointers are effectively on the same spot. */
const MIN_SPAN = 1e-6;

export function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angleDeg(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Fold an angle delta into (-180, 180] so a turn past 180° doesn't spin backwards. */
function normalizeAngle(deg: number): number {
  let d = deg;
  while (d <= -180) d += 360;
  while (d > 180) d -= 360;
  return d;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Apply a pointer movement to a base transform.
 *
 * `start` and `current` are the same pointer set sampled at gesture start and
 * now. One pointer pans; two or more also scale and rotate. Callers re-snapshot
 * both the base and `start` whenever the pointer count changes, which is what
 * keeps a lifted finger from making the layer jump.
 */
export function computeGestureTransform(
  base: Transform,
  start: Point[],
  current: Point[]
): Transform {
  const count = Math.min(start.length, current.length);
  if (count === 0) return base;

  const from = start.slice(0, count);
  const to = current.slice(0, count);

  const startCentre = centroid(from);
  const currentCentre = centroid(to);

  const next: Transform = {
    x: base.x + (currentCentre.x - startCentre.x),
    y: base.y + (currentCentre.y - startCentre.y),
    scale: base.scale,
    rotation: base.rotation,
  };

  if (count < 2) return next;

  const startSpan = distance(from[0], from[1]);
  const currentSpan = distance(to[0], to[1]);

  // Two pointers on the same spot carry no scale or angle information.
  if (startSpan < MIN_SPAN || currentSpan < MIN_SPAN) return next;

  next.scale = clamp(base.scale * (currentSpan / startSpan), MIN_SCALE, MAX_SCALE);
  next.rotation =
    base.rotation + normalizeAngle(angleDeg(to[0], to[1]) - angleDeg(from[0], from[1]));

  return next;
}
