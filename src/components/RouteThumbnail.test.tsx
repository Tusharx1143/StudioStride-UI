import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteThumbnail } from "./RouteThumbnail";
import { fitRoute, toRouteGeometry } from "../utils/routeGeometry";

const GEOMETRY = toRouteGeometry([
  [45.0, -73.6],
  [45.1, -73.5],
  [45.05, -73.4],
  [45.02, -73.55],
])!;

function points(markup: string): number[][] {
  const m = markup.match(/points="([^"]+)"/);
  return m![1].trim().split(/\s+/).map((p) => p.split(",").map(Number));
}

describe("RouteThumbnail", () => {
  test("plots one coordinate pair per geometry point", () => {
    const markup = renderToStaticMarkup(<RouteThumbnail geometry={GEOMETRY} />);

    expect(points(markup).length).toBe(GEOMETRY.points.length);
  });

  test("uses the same fit as the editor and export", () => {
    // A thumbnail that disagreed with the canvas would show a different shape
    // for the same run.
    const size = 40;
    const strokeWidth = 2;
    const markup = renderToStaticMarkup(
      <RouteThumbnail geometry={GEOMETRY} size={size} strokeWidth={strokeWidth} />
    );

    const expected = fitRoute(GEOMETRY, size - strokeWidth * 2);
    const actual = points(markup);

    // Coordinates are emitted at 2dp; sub-hundredth precision is meaningless
    // at thumbnail size.
    for (let i = 0; i < expected.length; i++) {
      expect(actual[i][0]).toBeCloseTo(expected[i][0], 2);
      expect(actual[i][1]).toBeCloseTo(expected[i][1], 2);
    }
  });

  test("insets the path so the stroke is not clipped by the badge", () => {
    const markup = renderToStaticMarkup(
      <RouteThumbnail geometry={GEOMETRY} size={40} strokeWidth={6} />
    );

    const half = 40 / 2;
    for (const [x, y] of points(markup)) {
      expect(Math.abs(x)).toBeLessThanOrEqual(half);
      expect(Math.abs(y)).toBeLessThanOrEqual(half);
    }
  });

  test("applies the requested colour and stroke width", () => {
    const markup = renderToStaticMarkup(
      <RouteThumbnail geometry={GEOMETRY} color="#101014" strokeWidth={3} />
    );

    expect(markup).toContain('stroke="#101014"');
    expect(markup).toContain('stroke-width="3"');
  });

  test("renders nothing when the geometry is unusable", () => {
    // Lets the caller fall back to the activity icon.
    const markup = renderToStaticMarkup(
      <RouteThumbnail geometry={{ points: [[0, 0]], aspect: 1 }} />
    );

    expect(markup).toBe("");
  });
});
