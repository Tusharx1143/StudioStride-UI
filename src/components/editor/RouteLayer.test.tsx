import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteLayer } from "./RouteLayer";
import { fitRoute, toRouteGeometry } from "../../utils/routeGeometry";
import type { RouteOverlay } from "../../types";

const GEOMETRY = toRouteGeometry([
  [45.0, -73.6],
  [45.1, -73.5],
  [45.05, -73.4],
  [45.02, -73.55],
])!;

function overlay(patch: Partial<RouteOverlay> = {}): RouteOverlay {
  return {
    id: "route_1",
    geometry: GEOMETRY,
    x: 0,
    y: 0,
    size: 120,
    color: "#FF5A1F",
    strokeWidth: 3,
    opacity: 1,
    ...patch,
  };
}

/** Pull the `points` attribute out of the rendered polyline. */
function polylinePoints(markup: string): string | null {
  const match = markup.match(/points="([^"]+)"/);
  return match ? match[1] : null;
}

describe("RouteLayer", () => {
  test("renders one coordinate pair per geometry point", () => {
    const markup = renderToStaticMarkup(<RouteLayer overlay={overlay()} />);

    const pairs = polylinePoints(markup)!.trim().split(/\s+/);
    expect(pairs.length).toBe(GEOMETRY.points.length);
  });

  test("plots the same coordinates the canvas export uses", () => {
    // Preview and export must agree; both go through fitRoute.
    const markup = renderToStaticMarkup(<RouteLayer overlay={overlay()} />);
    const expected = fitRoute(GEOMETRY, 120);

    const pairs = polylinePoints(markup)!
      .trim()
      .split(/\s+/)
      .map((p) => p.split(",").map(Number));

    for (let i = 0; i < expected.length; i++) {
      expect(pairs[i][0]).toBeCloseTo(expected[i][0], 3);
      expect(pairs[i][1]).toBeCloseTo(expected[i][1], 3);
    }
  });

  test("applies colour, stroke width and opacity", () => {
    const markup = renderToStaticMarkup(
      <RouteLayer overlay={overlay({ color: "#00FF88", strokeWidth: 5, opacity: 0.4 })} />
    );

    expect(markup).toContain('stroke="#00FF88"');
    expect(markup).toContain('stroke-width="5"');
    expect(markup).toContain('opacity="0.4"');
  });

  test("uses round caps and joins, matching the export", () => {
    const markup = renderToStaticMarkup(<RouteLayer overlay={overlay()} />);

    expect(markup).toContain('stroke-linecap="round"');
    expect(markup).toContain('stroke-linejoin="round"');
  });

  test("renders nothing when the layer is hidden", () => {
    const markup = renderToStaticMarkup(<RouteLayer overlay={overlay({ hidden: true })} />);

    expect(markup).toBe("");
  });

  test("renders nothing when the geometry has too few points", () => {
    const markup = renderToStaticMarkup(
      <RouteLayer overlay={overlay({ geometry: { points: [[0, 0]], aspect: 1 } })} />
    );

    expect(markup).toBe("");
  });
});
