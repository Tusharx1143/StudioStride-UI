import { describe, expect, test } from "vitest";
import { routePointsInBox, sampleSplits, splitBars } from "./chartGeometry";
import { toRouteGeometry } from "./routeGeometry";
import type { SplitSample } from "../types";

function splits(paces: number[]): SplitSample[] {
  return paces.map((pace, i) => ({
    index: i + 1,
    distanceMeters: 1000,
    elapsed: pace,
    paceSecondsPerKm: pace,
  }));
}

const GEOMETRY = toRouteGeometry([
  [45.0, -73.6],
  [45.1, -73.5],
  [45.05, -73.4],
  [45.02, -73.55],
])!;

describe("routePointsInBox", () => {
  test("returns one point per geometry point", () => {
    const points = routePointsInBox(GEOMETRY, 100, 80, "contain");
    expect(points).toHaveLength(GEOMETRY.points.length);
  });

  test("contain keeps every point inside the box", () => {
    const points = routePointsInBox(GEOMETRY, 100, 80, "contain");
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(80);
    }
  });

  test("centres the path on the box", () => {
    const points = routePointsInBox(GEOMETRY, 100, 80, "contain");
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect(midX).toBeCloseTo(50, 5);
    expect(midY).toBeCloseTo(40, 5);
  });

  test("cover spreads the path wider than contain does", () => {
    const spread = (pts: [number, number][]) =>
      Math.max(...pts.map(([x]) => x)) - Math.min(...pts.map(([x]) => x));

    const contained = routePointsInBox(GEOMETRY, 100, 80, "contain");
    const covered = routePointsInBox(GEOMETRY, 100, 80, "cover");

    expect(spread(covered)).toBeGreaterThan(spread(contained));
  });
});

describe("sampleSplits", () => {
  test("returns the input untouched when it already fits", () => {
    const input = splits([300, 310, 305]);
    expect(sampleSplits(input, 12)).toBe(input);
  });

  test("samples down to the cap, keeping the first and last", () => {
    const input = splits(Array.from({ length: 30 }, (_, i) => 300 + i));
    const out = sampleSplits(input, 8);

    expect(out).toHaveLength(8);
    expect(out[0].index).toBe(1);
    expect(out[out.length - 1].index).toBe(30);
  });

  test("samples rather than truncating, so the run's whole shape survives", () => {
    const input = splits(Array.from({ length: 30 }, (_, i) => 300 + i));
    const out = sampleSplits(input, 5);

    // Truncation would give indices 1..5; sampling spreads across the run.
    expect(out.map((s) => s.index)).not.toEqual([1, 2, 3, 4, 5]);
  });
});

describe("splitBars", () => {
  test("produces one bar per split, left to right, inside the box", () => {
    const bars = splitBars(splits([360, 372, 350]), 120, 40, 12);

    expect(bars).toHaveLength(3);
    expect(bars[0].x).toBeLessThan(bars[1].x);
    for (const bar of bars) {
      expect(bar.x).toBeGreaterThanOrEqual(0);
      expect(bar.x + bar.width).toBeLessThanOrEqual(120.0001);
      expect(bar.y).toBeGreaterThanOrEqual(0);
      // Bottom-aligned: every bar's foot sits on the box floor.
      expect(bar.y + bar.height).toBeCloseTo(40, 4);
    }
  });

  test("the fastest split is the tallest bar and is flagged", () => {
    const bars = splitBars(splits([360, 372, 350]), 120, 40, 12);
    const fastest = bars.find((b) => b.isFastest)!;

    expect(fastest.index).toBe(3);
    expect(Math.max(...bars.map((b) => b.height))).toBeCloseTo(fastest.height, 5);
  });

  test("the slowest split is the shortest bar but still visible", () => {
    const bars = splitBars(splits([360, 372, 350]), 120, 40, 12);
    const shortest = Math.min(...bars.map((b) => b.height));

    expect(shortest).toBeGreaterThan(0);
    // A 5:00-6:00 run spans only a 1.2x pace ratio; scaling straight off pace
    // would make the chart near-flat, so the range is normalised instead.
    expect(shortest).toBeCloseTo(40 * 0.35, 4);
  });

  test("uniform splits render at full height rather than collapsing", () => {
    const bars = splitBars(splits([360, 360, 360]), 120, 40, 12);
    for (const bar of bars) expect(bar.height).toBeCloseTo(40, 5);
  });

  test("returns nothing for an empty series", () => {
    expect(splitBars([], 120, 40, 12)).toEqual([]);
  });

  test("honours the bar cap", () => {
    const bars = splitBars(splits(Array.from({ length: 20 }, (_, i) => 360 + i)), 200, 40, 8);
    expect(bars).toHaveLength(8);
  });
});
