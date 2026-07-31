import { describe, expect, test } from "vitest";
import { collectLayers } from "./renderComposite";
import type { RouteOverlay, StickerOverlay, TextOverlay } from "../types";

const TEXT: TextOverlay = {
  id: "t1",
  text: "Sunrise",
  x: 0,
  y: 0,
  color: "#FFFFFF",
  fontStyle: "Bold",
  bgStyle: "solid",
  align: "center",
  fontSize: 32,
};

const STICKER: StickerOverlay = {
  id: "s1",
  content: "🔥",
  type: "emoji",
  scale: 1,
  rotation: 0,
  x: 0,
  y: 0,
};

const ROUTE = {
  id: "r1",
  geometry: { points: [] },
  x: 0,
  y: 0,
  size: 200,
  color: "#FF7A1A",
  strokeWidth: 4,
  opacity: 1,
} as unknown as RouteOverlay;

/** A stand-in for the drawing layer — collectLayers only checks for presence. */
const CANVAS = {} as HTMLCanvasElement;

function params(overrides: Partial<Parameters<typeof collectLayers>[0]> = {}) {
  return {
    textOverlays: [] as TextOverlay[],
    stickerOverlays: [] as StickerOverlay[],
    routeOverlay: null as RouteOverlay | null,
    drawingCanvas: null as HTMLCanvasElement | null,
    isBaseImageHidden: false,
    isDrawingHidden: false,
    baseImageZIndex: 0,
    drawingZIndex: 30,
    ...overrides,
  };
}

describe("collectLayers", () => {
  test("includes the base image by default", () => {
    expect(collectLayers(params()).map((l) => l.type)).toEqual(["image"]);
  });

  test("omits the base image when it is hidden", () => {
    expect(collectLayers(params({ isBaseImageHidden: true }))).toEqual([]);
  });

  test("omits the drawing when there is no drawing canvas", () => {
    const types = collectLayers(params({ drawingCanvas: null })).map((l) => l.type);
    expect(types).not.toContain("draw");
  });

  test("includes the drawing once a canvas exists", () => {
    const types = collectLayers(params({ drawingCanvas: CANVAS })).map((l) => l.type);
    expect(types).toContain("draw");
  });

  test("omits the drawing when it is hidden", () => {
    const types = collectLayers(
      params({ drawingCanvas: CANVAS, isDrawingHidden: true })
    ).map((l) => l.type);
    expect(types).not.toContain("draw");
  });

  test("omits hidden text, stickers, and the route", () => {
    const layers = collectLayers(
      params({
        textOverlays: [{ ...TEXT, hidden: true }],
        stickerOverlays: [{ ...STICKER, hidden: true }],
        routeOverlay: { ...ROUTE, hidden: true },
      })
    );

    expect(layers.map((l) => l.type)).toEqual(["image"]);
  });

  test("omits the route when none was placed", () => {
    const types = collectLayers(params({ routeOverlay: null })).map((l) => l.type);
    expect(types).not.toContain("route");
  });

  test("applies documented default z-indices", () => {
    const layers = collectLayers(
      params({
        textOverlays: [TEXT],
        stickerOverlays: [STICKER],
        routeOverlay: ROUTE,
      })
    );

    const byType = Object.fromEntries(layers.map((l) => [l.type, l.zIndex]));
    expect(byType.text).toBe(20);
    expect(byType.sticker).toBe(20);
    expect(byType.route).toBe(40);
  });

  test("sorts ascending by zIndex", () => {
    const layers = collectLayers(
      params({
        drawingCanvas: CANVAS,
        drawingZIndex: 30,
        baseImageZIndex: 0,
        textOverlays: [{ ...TEXT, zIndex: 50 }],
        stickerOverlays: [{ ...STICKER, zIndex: 10 }],
        routeOverlay: { ...ROUTE, zIndex: 40 },
      })
    );

    expect(layers.map((l) => l.zIndex)).toEqual([0, 10, 30, 40, 50]);
    expect(layers.map((l) => l.type)).toEqual(["image", "sticker", "draw", "route", "text"]);
  });

  test("carries the overlay through as layer data", () => {
    const layers = collectLayers(params({ textOverlays: [TEXT] }));
    expect(layers.find((l) => l.type === "text")?.data).toBe(TEXT);
  });
});
