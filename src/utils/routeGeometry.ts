/**
 * Projection and fitting for activity route paths.
 *
 * All geo math lives here and runs once, in the source adapter. Everything
 * downstream — the SVG preview and the canvas export — works in plain 2D on
 * the normalized output, which is what keeps the two renderers from drifting.
 */

const DEG = Math.PI / 180;

/** Summary polylines run 100-300 points; an ultra can run far longer. */
const MAX_POINTS = 1000;

/**
 * Extent below which an axis carries no usable spread. 1e-7 degrees is about
 * a centimetre — well under the 1e-5 precision an encoded polyline stores.
 */
const MIN_EXTENT = 1e-7;

export interface RouteGeometry {
  /** Points normalized into a 0..1 box, with y already flipped for screen. */
  points: [number, number][];
  /** Projected width / height, so a fit can preserve the route's shape. */
  aspect: number;
}

/**
 * Project `[lat, lng]` pairs into a normalized, screen-oriented unit box.
 *
 * Returns `null` when there is no usable route: too few points, or a bounding
 * box with no extent on either axis (a GPS lock), which would otherwise divide
 * by zero and produce NaN coordinates.
 */
export function toRouteGeometry(points: [number, number][]): RouteGeometry | null {
  if (!points || points.length < 2) return null;

  const sampled = downsample(points, MAX_POINTS);

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of sampled) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  // Equirectangular projection: a degree of longitude narrows toward the
  // poles, so scale it by cos(latitude) or every northern route reads too wide.
  const lngScale = Math.cos(((minLat + maxLat) / 2) * DEG);

  const rawWidth = (maxLng - minLng) * lngScale;
  const rawHeight = maxLat - minLat;

  // No extent on either axis — nothing to draw.
  if (rawWidth < MIN_EXTENT && rawHeight < MIN_EXTENT) return null;

  // A dead-straight run has zero extent on one axis; clamping keeps aspect
  // finite so it renders as a line rather than poisoning the fit.
  const width = Math.max(rawWidth, MIN_EXTENT);
  const height = Math.max(rawHeight, MIN_EXTENT);

  const normalized = sampled.map(
    ([lat, lng]) =>
      [
        ((lng - minLng) * lngScale) / width,
        // Screen y grows downward, latitude grows northward.
        (maxLat - lat) / height,
      ] as [number, number]
  );

  return { points: normalized, aspect: width / height };
}

/**
 * Scale normalized geometry to a box whose longest edge is `size`, centred on
 * the origin — matching the centre-offset convention every editor overlay uses.
 */
export function fitRoute(geometry: RouteGeometry, size: number): [number, number][] {
  const wide = geometry.aspect >= 1;
  const width = wide ? size : size * geometry.aspect;
  const height = wide ? size / geometry.aspect : size;

  return geometry.points.map(
    ([x, y]) => [(x - 0.5) * width, (y - 0.5) * height] as [number, number]
  );
}

/** Keep at most `max` points, always including the first and the last. */
function downsample(points: [number, number][], max: number): [number, number][] {
  if (points.length <= max) return points;

  const stride = Math.ceil(points.length / max);
  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i += stride) out.push(points[i]);

  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);

  return out;
}
