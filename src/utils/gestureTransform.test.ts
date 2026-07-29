import { describe, expect, test } from "vitest";
import { MAX_SCALE, MIN_SCALE, computeGestureTransform, type Transform } from "./gestureTransform";

const BASE: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };

describe("computeGestureTransform — single pointer", () => {
  test("pans by the pointer delta", () => {
    const next = computeGestureTransform(BASE, [{ x: 100, y: 100 }], [{ x: 140, y: 70 }]);

    expect(next.x).toBeCloseTo(40, 6);
    expect(next.y).toBeCloseTo(-30, 6);
  });

  test("leaves scale and rotation untouched", () => {
    const base = { x: 0, y: 0, scale: 2.5, rotation: 45 };

    const next = computeGestureTransform(base, [{ x: 0, y: 0 }], [{ x: 10, y: 10 }]);

    expect(next.scale).toBe(2.5);
    expect(next.rotation).toBe(45);
  });

  test("pans relative to the base offset, not from zero", () => {
    const base = { x: 200, y: 50, scale: 1, rotation: 0 };

    const next = computeGestureTransform(base, [{ x: 0, y: 0 }], [{ x: 10, y: 10 }]);

    expect(next.x).toBeCloseTo(210, 6);
    expect(next.y).toBeCloseTo(60, 6);
  });
});

describe("computeGestureTransform — two pointers", () => {
  test("pans without scaling when both pointers move together", () => {
    const start = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const current = [
      { x: 20, y: 10 },
      { x: 120, y: 10 },
    ];

    const next = computeGestureTransform(BASE, start, current);

    expect(next.x).toBeCloseTo(20, 6);
    expect(next.y).toBeCloseTo(10, 6);
    expect(next.scale).toBeCloseTo(1, 6);
    expect(next.rotation).toBeCloseTo(0, 6);
  });

  test("scales up by the ratio of pointer distances", () => {
    const start = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const current = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ];

    expect(computeGestureTransform(BASE, start, current).scale).toBeCloseTo(2, 6);
  });

  test("scales down when the pointers pinch together", () => {
    const start = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const current = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
    ];

    expect(computeGestureTransform(BASE, start, current).scale).toBeCloseTo(0.5, 6);
  });

  test("scales relative to the base scale", () => {
    const base = { x: 0, y: 0, scale: 1.5, rotation: 0 };
    const start = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const current = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ];

    expect(computeGestureTransform(base, start, current).scale).toBeCloseTo(3, 6);
  });

  test("rotates by the angle the pointer pair turned through", () => {
    const start = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]; // 0°
    const current = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ]; // 90°

    expect(computeGestureTransform(BASE, start, current).rotation).toBeCloseTo(90, 6);
  });

  test("takes the short way around when the angle crosses 180 degrees", () => {
    // Without normalization this reads as -340° instead of +20°, and the
    // layer spins almost a full turn the wrong way.
    const start = [
      { x: 0, y: 0 },
      { x: -100, y: 17.6327 },
    ]; // ~170°
    const current = [
      { x: 0, y: 0 },
      { x: -100, y: -17.6327 },
    ]; // ~-170°

    const next = computeGestureTransform(BASE, start, current);

    expect(next.rotation).toBeGreaterThan(0);
    expect(next.rotation).toBeCloseTo(20, 3);
  });

  test("pans, scales and rotates simultaneously", () => {
    const start = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const current = [
      { x: 50, y: 50 },
      { x: 50, y: 250 },
    ];

    const next = computeGestureTransform(BASE, start, current);

    // centroid moved (50,0) → (50,150)
    expect(next.x).toBeCloseTo(0, 6);
    expect(next.y).toBeCloseTo(150, 6);
    expect(next.scale).toBeCloseTo(2, 6);
    expect(next.rotation).toBeCloseTo(90, 6);
  });
});

describe("computeGestureTransform — stability", () => {
  test("returns the base unchanged when nothing has moved", () => {
    // This is what makes re-baselining jump-free: after a pointer lifts, the
    // component re-snapshots, and an unmoved pointer set must be a no-op.
    const base = { x: 30, y: -12, scale: 1.8, rotation: 22 };
    const pointers = [
      { x: 10, y: 10 },
      { x: 90, y: 40 },
    ];

    const next = computeGestureTransform(base, pointers, pointers);

    expect(next.x).toBeCloseTo(base.x, 6);
    expect(next.y).toBeCloseTo(base.y, 6);
    expect(next.scale).toBeCloseTo(base.scale, 6);
    expect(next.rotation).toBeCloseTo(base.rotation, 6);
  });

  test("returns the base when there are no pointers", () => {
    expect(computeGestureTransform(BASE, [], [])).toEqual(BASE);
  });

  test("clamps runaway zoom-in", () => {
    const start = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    const current = [
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
    ];

    expect(computeGestureTransform(BASE, start, current).scale).toBe(MAX_SCALE);
  });

  test("clamps runaway zoom-out", () => {
    const start = [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
    ];
    const current = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];

    expect(computeGestureTransform(BASE, start, current).scale).toBe(MIN_SCALE);
  });

  test("survives two pointers landing on the same spot", () => {
    // A zero start distance would divide by zero and yield Infinity/NaN.
    const start = [
      { x: 50, y: 50 },
      { x: 50, y: 50 },
    ];
    const current = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];

    const next = computeGestureTransform(BASE, start, current);

    expect(Number.isFinite(next.scale)).toBe(true);
    expect(Number.isFinite(next.rotation)).toBe(true);
    expect(Number.isNaN(next.x)).toBe(false);
  });
});
