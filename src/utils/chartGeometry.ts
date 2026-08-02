/**
 * Shared geometry for chart slots.
 *
 * Both renderers — the DOM one and its canvas twin — call these, so a chart
 * cannot come out a different shape in the export than it did on screen. Same
 * reason `fitRoute` is shared between the SVG route preview and its exporter.
 */

import type { SplitSample } from "../types";
import type { RouteGeometry } from "./routeGeometry";
import { fitRoute } from "./routeGeometry";

export type ChartFit = "contain" | "cover";

/**
 * Scale a route into a `width` x `height` box, centred.
 *
 * `fitRoute` centres on the origin, matching the convention every editor
 * overlay uses; this translates into box coordinates, where (0,0) is the
 * top-left corner.
 */
export function routePointsInBox(
  geometry: RouteGeometry,
  width: number,
  height: number,
  fit: ChartFit = "contain"
): [number, number][] {
  // fitRoute sizes the longest edge, so "contain" measures against the box's
  // shorter edge and "cover" against its longer one.
  const size = fit === "cover" ? Math.max(width, height) : Math.min(width, height);

  return fitRoute(geometry, size).map(
    ([x, y]) => [x + width / 2, y + height / 2] as [number, number]
  );
}

/**
 * Shortest bar as a fraction of the tallest.
 *
 * A run between 5:00 and 6:00 per km spans only a 1.2x pace ratio, so scaling
 * bars directly against pace produces a near-flat chart. Normalising across
 * the observed range instead makes the shape readable — the bars express
 * relative effort within this activity, not an absolute pace.
 */
const MIN_BAR_RATIO = 0.35;

/** Gap between bars, as a fraction of the box width. */
const BAR_GAP_RATIO = 0.02;

export interface SplitBar {
  /** 1-based split number this bar came from. */
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isFastest: boolean;
}

/**
 * At most `max` splits, always including the first and the last.
 *
 * Sampled rather than truncated, so the last kilometre of a long run still
 * appears — mirrors `downsample` in routeGeometry.
 */
export function sampleSplits(splits: SplitSample[], max: number): SplitSample[] {
  if (max <= 0 || splits.length <= max) return splits;
  if (max === 1) return [splits[0]];

  const stride = (splits.length - 1) / (max - 1);
  const out: SplitSample[] = [];
  for (let i = 0; i < max; i++) out.push(splits[Math.round(i * stride)]);
  return out;
}

/**
 * Bars for a splits chart, in box coordinates with (0,0) at the top-left.
 *
 * Bottom-aligned: `y + height` always equals the box height.
 */
export function splitBars(
  splits: SplitSample[],
  width: number,
  height: number,
  maxBars: number
): SplitBar[] {
  const sampled = sampleSplits(splits, maxBars);
  if (sampled.length === 0) return [];

  const paces = sampled.map((s) => s.paceSecondsPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const span = slowest - fastest;

  const gap = width * BAR_GAP_RATIO;
  const barWidth = (width - gap * (sampled.length - 1)) / sampled.length;

  return sampled.map((split, i) => {
    // No span means every split came out identical; a flat full-height chart
    // is more honest than an arbitrary ranking of rounding noise.
    const ratio =
      span > 0
        ? MIN_BAR_RATIO +
          (1 - MIN_BAR_RATIO) * ((slowest - split.paceSecondsPerKm) / span)
        : 1;
    const barHeight = height * ratio;

    return {
      index: split.index,
      x: i * (barWidth + gap),
      y: height - barHeight,
      width: barWidth,
      height: barHeight,
      isFastest: split.paceSecondsPerKm === fastest,
    };
  });
}
