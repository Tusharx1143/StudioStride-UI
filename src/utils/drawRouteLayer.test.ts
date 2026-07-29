import { describe, expect, test } from "vitest";
import { fakeContext } from "../test/fakeContext";
import { drawRouteLayer } from "./drawRouteLayer";
import { toRouteGeometry } from "./routeGeometry";
import type { RouteOverlay } from "../types";

const GEOMETRY = toRouteGeometry([
  [45.0, -73.6],
  [45.1, -73.5],
  [45.05, -73.4],
])!;

/** Preview container and export canvas, matching ExportModal's scale math. */
const FRAME = {
  containerWidth: 360,
  containerHeight: 640,
  scaleX: 3,
  scaleY: 3,
};

function overlay(patch: Partial<RouteOverlay> = {}): RouteOverlay {
  return {
    id: "route_1",
    geometry: GEOMETRY,
    x: 0,
    y: 0,
    size: 100,
    color: "#FF0000",
    strokeWidth: 3,
    opacity: 1,
    ...patch,
  };
}

describe("drawRouteLayer", () => {
  test("strokes one connected path through every point", () => {
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay(), FRAME);

    expect(fake.countOf("beginPath")).toBe(1);
    expect(fake.countOf("moveTo")).toBe(1);
    expect(fake.countOf("lineTo")).toBe(GEOMETRY.points.length - 1);
    expect(fake.countOf("stroke")).toBe(1);
  });

  test("scales stroke width by the export scale", () => {
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay({ strokeWidth: 3 }), FRAME);

    expect(fake.props.lineWidth).toBeCloseTo(9, 6);
  });

  test("floors stroke width so a thin route never vanishes", () => {
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay({ strokeWidth: 0.1 }), {
      ...FRAME,
      scaleX: 1,
      scaleY: 1,
    });

    expect(fake.props.lineWidth).toBe(2);
  });

  test("uses round caps and joins", () => {
    // A GPS trace changes direction hundreds of times; mitre joins spike into
    // visible spurs at every switchback.
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay(), FRAME);

    expect(fake.props.lineCap).toBe("round");
    expect(fake.props.lineJoin).toBe("round");
  });

  test("applies colour and opacity", () => {
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay({ color: "#00FF88", opacity: 0.5 }), FRAME);

    expect(fake.props.strokeStyle).toBe("#00FF88");
    expect(fake.props.globalAlpha).toBeCloseTo(0.5, 6);
  });

  test("positions the route relative to the container centre", () => {
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay({ x: 0, y: 0 }), FRAME);

    // (360/2 + 0) * 3, (640/2 + 0) * 3
    expect(fake.argsFor("translate")[0]).toEqual([540, 960]);
  });

  test("offsets the route by its stored centre offset", () => {
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay({ x: 20, y: -10 }), FRAME);

    expect(fake.argsFor("translate")[0]).toEqual([600, 930]);
  });

  test("rotates when the layer is rotated", () => {
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay({ rotation: 90 }), FRAME);

    expect(fake.argsFor("rotate")[0][0]).toBeCloseTo(Math.PI / 2, 6);
  });

  test("multiplies size by the layer scale", () => {
    // DraggableLayer applies scale as a CSS transform in the preview; the
    // export has to apply the same factor or the two diverge.
    const plain = fakeContext();
    const scaled = fakeContext();

    drawRouteLayer(plain.ctx, overlay({ scale: 1 }), FRAME);
    drawRouteLayer(scaled.ctx, overlay({ scale: 2 }), FRAME);

    const plainMove = plain.argsFor("moveTo")[0] as number[];
    const scaledMove = scaled.argsFor("moveTo")[0] as number[];

    expect(scaledMove[0]).toBeCloseTo(plainMove[0] * 2, 6);
    expect(scaledMove[1]).toBeCloseTo(plainMove[1] * 2, 6);
  });

  test("treats a missing scale as 1", () => {
    const implicit = fakeContext();
    const explicit = fakeContext();

    drawRouteLayer(implicit.ctx, overlay(), FRAME);
    drawRouteLayer(explicit.ctx, overlay({ scale: 1 }), FRAME);

    expect(implicit.argsFor("moveTo")[0]).toEqual(explicit.argsFor("moveTo")[0]);
  });

  test("draws nothing when the layer is hidden", () => {
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay({ hidden: true }), FRAME);

    expect(fake.countOf("stroke")).toBe(0);
  });

  test("draws nothing when the geometry has too few points", () => {
    const fake = fakeContext();

    drawRouteLayer(
      fake.ctx,
      overlay({ geometry: { points: [[0, 0]], aspect: 1 } }),
      FRAME
    );

    expect(fake.countOf("stroke")).toBe(0);
  });

  test("restores the context it saved", () => {
    const fake = fakeContext();

    drawRouteLayer(fake.ctx, overlay(), FRAME);

    expect(fake.countOf("save")).toBe(fake.countOf("restore"));
    expect(fake.countOf("save")).toBe(1);
  });
});
