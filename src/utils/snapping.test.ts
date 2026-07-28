import { describe, expect, test } from "vitest";
import { buildSnapLines, computeSnap } from "./snapping";
import type { SnapRect } from "./snapping";

const canvas = { width: 400, height: 800 };
const rect = (left: number, top: number): SnapRect => ({
  left,
  top,
  width: 100,
  height: 40,
});

describe("buildSnapLines", () => {
  test("offers the canvas centre on both axes", () => {
    const lines = buildSnapLines(canvas, 20, []);

    expect(lines).toContainEqual({ axis: "x", position: 200 });
    expect(lines).toContainEqual({ axis: "y", position: 400 });
  });

  test("offers both gutters on both axes", () => {
    const lines = buildSnapLines(canvas, 20, []);

    expect(lines).toContainEqual({ axis: "x", position: 20 });
    expect(lines).toContainEqual({ axis: "x", position: 380 });
    expect(lines).toContainEqual({ axis: "y", position: 20 });
    expect(lines).toContainEqual({ axis: "y", position: 780 });
  });

  test("offers a peer's edges and centre", () => {
    const lines = buildSnapLines(canvas, 20, [rect(50, 100)]);

    expect(lines).toContainEqual({ axis: "x", position: 50 });
    expect(lines).toContainEqual({ axis: "x", position: 100 });
    expect(lines).toContainEqual({ axis: "x", position: 150 });
    expect(lines).toContainEqual({ axis: "y", position: 100 });
    expect(lines).toContainEqual({ axis: "y", position: 120 });
    expect(lines).toContainEqual({ axis: "y", position: 140 });
  });
});

describe("computeSnap", () => {
  const lines = buildSnapLines(canvas, 20, []);

  test("leaves a rect alone when nothing is within the threshold", () => {
    const result = computeSnap(rect(300, 300), lines, 8);

    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.guides).toEqual([]);
  });

  test("snaps the rect's centre to the canvas centre", () => {
    // centre sits at 155, five short of 200 - width/2 = 150
    const result = computeSnap(rect(155, 300), lines, 8);

    expect(result.dx).toBe(-5);
    expect(result.guides).toContainEqual({ axis: "x", position: 200 });
  });

  test("snaps the rect's left edge to the gutter", () => {
    const result = computeSnap(rect(24, 300), lines, 8);

    expect(result.dx).toBe(-4);
    expect(result.guides).toContainEqual({ axis: "x", position: 20 });
  });

  test("snaps both axes at once", () => {
    const result = computeSnap(rect(24, 776), lines, 8);

    expect(result.dx).toBe(-4); // left edge 24 -> gutter 20
    expect(result.dy).toBe(4); // top edge 776 -> gutter 780
    expect(result.guides.length).toBe(2);
  });

  test("snaps by whichever of the three edges is nearest", () => {
    // centre sits at 195, five from the 200 line; the left edge is 55 away
    const result = computeSnap(rect(145, 300), lines, 8);

    expect(result.dx).toBe(5);
    expect(result.guides).toEqual([{ axis: "x", position: 200 }]);
  });

  test("prefers the nearest line when several are in range", () => {
    const crowded = [
      { axis: "x" as const, position: 100 },
      { axis: "x" as const, position: 106 },
    ];

    const result = computeSnap(rect(102, 300), crowded, 10);

    // left edge 102 is nearer 100 than 106
    expect(result.dx).toBe(-2);
    expect(result.guides).toEqual([{ axis: "x", position: 100 }]);
  });

  test("aligns a rect to a peer's edge", () => {
    const withPeer = buildSnapLines(canvas, 20, [rect(50, 100)]);

    const result = computeSnap(rect(54, 300), withPeer, 8);

    expect(result.dx).toBe(-4);
    expect(result.guides).toContainEqual({ axis: "x", position: 50 });
  });

  test("a zero threshold disables snapping", () => {
    const result = computeSnap(rect(155, 300), lines, 0);

    expect(result).toEqual({ dx: 0, dy: 0, guides: [] });
  });
});
