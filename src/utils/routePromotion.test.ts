import { describe, expect, test } from "vitest";
import { promoteRouteSlot } from "./routePromotion";
import { toRouteGeometry } from "./routeGeometry";
import type { ChartStyle } from "../types";

const GEOMETRY = toRouteGeometry([
  [45.0, -73.6],
  [45.1, -73.5],
  [45.05, -73.4],
])!;

const STYLE: ChartStyle = {
  chart: "route_trace",
  width: 250,
  height: 250,
  color: "#FFFFFF",
  trackColor: "rgba(0,0,0,0.5)",
  strokeWidth: 2.5,
};

const CANVAS = { width: 390, height: 693 };

describe("promoteRouteSlot", () => {
  test("carries the template's colour and stroke onto the overlay", () => {
    const overlay = promoteRouteSlot({
      geometry: GEOMETRY,
      style: STYLE,
      pos: { x: 18, y: 26 },
      canvas: CANVAS,
    });

    expect(overlay.color).toBe("#FFFFFF");
    expect(overlay.strokeWidth).toBeCloseTo(2.5, 5);
    expect(overlay.geometry).toBe(GEOMETRY);
  });

  test("converts the percentage anchor into a centre-relative offset", () => {
    // The template anchors a slot by its top-left corner, so a chart sits dead
    // centre when its anchor is half the chart's size up and left of the
    // canvas midpoint. That case must promote to a zero offset.
    const scale = CANVAS.width / 390;
    const halfWPct = ((STYLE.width * scale) / 2 / CANVAS.width) * 100;
    const halfHPct = ((STYLE.height * scale) / 2 / CANVAS.height) * 100;

    const overlay = promoteRouteSlot({
      geometry: GEOMETRY,
      style: STYLE,
      pos: { x: 50 - halfWPct, y: 50 - halfHPct },
      canvas: CANVAS,
    });

    expect(overlay.x).toBeCloseTo(0, 4);
    expect(overlay.y).toBeCloseTo(0, 4);
  });

  test("sizes the overlay from the template's authored chart box", () => {
    const overlay = promoteRouteSlot({
      geometry: GEOMETRY,
      style: STYLE,
      pos: { x: 0, y: 0 },
      canvas: CANVAS,
    });

    // 250 reference px on a 390px canvas is 1:1, and the box is square.
    expect(overlay.size).toBeCloseTo(250, 4);
  });

  test("scales the size with a canvas wider than the reference", () => {
    const overlay = promoteRouteSlot({
      geometry: GEOMETRY,
      style: STYLE,
      pos: { x: 0, y: 0 },
      canvas: { width: 780, height: 1386 },
    });

    expect(overlay.size).toBeCloseTo(500, 4);
  });

  test("defaults stroke and opacity when the template leaves them out", () => {
    const overlay = promoteRouteSlot({
      geometry: GEOMETRY,
      style: { chart: "route_trace", width: 100, height: 100, color: "#FFF" },
      pos: { x: 0, y: 0 },
      canvas: CANVAS,
    });

    expect(overlay.strokeWidth).toBe(3);
    expect(overlay.opacity).toBe(1);
  });
});
