import { describe, expect, test } from "vitest";
import { fitRoute, toRouteGeometry } from "./routeGeometry";

const DEG = Math.PI / 180;

describe("toRouteGeometry", () => {
  test("normalizes points into the unit box", () => {
    const g = toRouteGeometry([
      [0, 0],
      [1, 1],
    ]);

    expect(g).not.toBeNull();
    for (const [x, y] of g!.points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
    expect(g!.points[0][0]).toBeCloseTo(0, 6);
    expect(g!.points[1][0]).toBeCloseTo(1, 6);
  });

  test("flips latitude so north renders upward", () => {
    // Screen y grows downward, latitude grows northward — without the flip
    // every route renders upside down.
    const g = toRouteGeometry([
      [0, 0], // south
      [1, 1], // north
    ]);

    expect(g!.points[0][1]).toBeCloseTo(1, 6); // south → bottom
    expect(g!.points[1][1]).toBeCloseTo(0, 6); // north → top
  });

  test("corrects longitude span by cos(latitude)", () => {
    // One degree of longitude covers half the ground distance at lat 60 that
    // it does at the equator, so the same degree-span is half as wide.
    const equator = toRouteGeometry([
      [0, 0],
      [1, 1],
    ]);
    const farNorth = toRouteGeometry([
      [60, 0],
      [61, 1],
    ]);

    expect(equator!.aspect).toBeCloseTo(Math.cos(0.5 * DEG), 2);
    expect(farNorth!.aspect).toBeCloseTo(Math.cos(60.5 * DEG), 2);
  });

  test("returns null for fewer than two points", () => {
    expect(toRouteGeometry([[10, 10]])).toBeNull();
    expect(toRouteGeometry([])).toBeNull();
  });

  test("returns null when every point is identical", () => {
    // A GPS lock produces a zero-extent bounding box on both axes, which
    // would divide by zero and yield NaN coordinates.
    const g = toRouteGeometry([
      [45.5, -73.6],
      [45.5, -73.6],
      [45.5, -73.6],
    ]);

    expect(g).toBeNull();
  });

  test("handles a dead-straight north-south route without NaN or Infinity", () => {
    // A track or pier run has zero longitude extent — unguarded, aspect
    // becomes Infinity and poisons the fit.
    const g = toRouteGeometry([
      [45.0, -73.6],
      [45.1, -73.6],
      [45.2, -73.6],
    ]);

    expect(g).not.toBeNull();
    expect(Number.isFinite(g!.aspect)).toBe(true);
    for (const [x, y] of g!.points) {
      expect(Number.isNaN(x)).toBe(false);
      expect(Number.isNaN(y)).toBe(false);
    }
  });

  test("downsamples very long routes while keeping both endpoints", () => {
    const many: [number, number][] = Array.from({ length: 2500 }, (_, i) => [
      45 + i * 0.001,
      -73 + i * 0.001,
    ]);

    const g = toRouteGeometry(many);

    expect(g!.points.length).toBeLessThanOrEqual(1000);
    expect(g!.points[0][0]).toBeCloseTo(0, 6);
    expect(g!.points[g!.points.length - 1][0]).toBeCloseTo(1, 6);
  });
});

describe("fitRoute", () => {
  test("centres the route on the origin within the requested size", () => {
    const g = toRouteGeometry([
      [0, 0],
      [1, 1],
    ])!;

    const fitted = fitRoute(g, 100);
    const xs = fitted.map((p) => p[0]);
    const ys = fitted.map((p) => p[1]);

    expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs), 6);
    expect(Math.min(...ys)).toBeCloseTo(-Math.max(...ys), 6);
    expect(Math.max(...xs)).toBeLessThanOrEqual(50.000001);
    expect(Math.max(...ys)).toBeLessThanOrEqual(50.000001);
  });

  test("produces proportional output across scales", () => {
    // This is what guarantees the export matches the editor preview: the only
    // difference between the two is the multiplier.
    const g = toRouteGeometry([
      [45.0, -73.6],
      [45.1, -73.5],
      [45.05, -73.4],
    ])!;

    const preview = fitRoute(g, 100);
    const exported = fitRoute(g, 300);

    expect(exported.length).toBe(preview.length);
    for (let i = 0; i < preview.length; i++) {
      expect(exported[i][0]).toBeCloseTo(preview[i][0] * 3, 6);
      expect(exported[i][1]).toBeCloseTo(preview[i][1] * 3, 6);
    }
  });

  test("keeps a wide route wider than it is tall", () => {
    // aspect must survive the fit, or an east-west run gets squashed square.
    const wide = toRouteGeometry([
      [45.0, -73.9],
      [45.01, -73.1],
    ])!;

    const fitted = fitRoute(wide, 100);
    const width = Math.max(...fitted.map((p) => p[0])) - Math.min(...fitted.map((p) => p[0]));
    const height = Math.max(...fitted.map((p) => p[1])) - Math.min(...fitted.map((p) => p[1]));

    expect(width).toBeGreaterThan(height);
  });
});
