import { describe, expect, test } from "vitest";
import {
  clearCustomLayout,
  commitDrag,
  resolveLayout,
  storeCustomLayout,
} from "./statLayouts";
import { TEMPLATE_STAT_DESIGNS } from "../data/templateStatDesigns";

describe("resolveLayout", () => {
  test("falls back to the template's default layout when nothing is customized", () => {
    const resolved = resolveLayout("hero", {});

    expect(resolved).toEqual(TEMPLATE_STAT_DESIGNS.hero.defaultLayout);
  });

  test("prefers a stored custom layout over the default", () => {
    const custom = { distance: { x: 70, y: 12 } };

    const resolved = resolveLayout("hero", { hero: custom });

    expect(resolved).toEqual(custom);
  });

  test("customizing one template does not affect another", () => {
    const customs = { hero: { distance: { x: 70, y: 12 } } };

    expect(resolveLayout("minimal", customs)).toEqual(
      TEMPLATE_STAT_DESIGNS.minimal.defaultLayout
    );
  });

  test("falls back to the default design for an unknown template id", () => {
    const resolved = resolveLayout("does-not-exist", {});

    expect(resolved).toEqual(TEMPLATE_STAT_DESIGNS.default.defaultLayout);
  });
});

describe("commitDrag", () => {
  const canvas = { width: 400, height: 800 };
  const chip = { width: 100, height: 40 };

  test("converts a pixel drag offset into a percentage delta", () => {
    const next = commitDrag({
      pos: { x: 10, y: 20 },
      offset: { x: 40, y: 80 },
      canvas,
      chip,
    });

    expect(next).toEqual({ x: 20, y: 30 });
  });

  test("clamps to the canvas top-left edge", () => {
    const next = commitDrag({
      pos: { x: 5, y: 5 },
      offset: { x: -200, y: -200 },
      canvas,
      chip,
    });

    expect(next).toEqual({ x: 0, y: 0 });
  });

  test("keeps the whole chip on canvas at the bottom-right edge", () => {
    const next = commitDrag({
      pos: { x: 50, y: 50 },
      offset: { x: 999, y: 999 },
      canvas,
      chip,
    });

    // chip is 25% of canvas width and 5% of canvas height
    expect(next).toEqual({ x: 75, y: 95 });
  });

  test("pins to zero when the chip is larger than the canvas", () => {
    const next = commitDrag({
      pos: { x: 10, y: 10 },
      offset: { x: 999, y: 999 },
      canvas,
      chip: { width: 600, height: 900 },
    });

    expect(next).toEqual({ x: 0, y: 0 });
  });
});

describe("custom layout storage", () => {
  test("storeCustomLayout records a template's layout without mutating the input", () => {
    const customs = {};
    const layout = { pace: { x: 30, y: 40 } };

    const next = storeCustomLayout(customs, "glass", layout);

    expect(next.glass).toEqual(layout);
    expect(customs).toEqual({});
  });

  test("clearCustomLayout removes only the named template", () => {
    const customs = {
      hero: { distance: { x: 1, y: 2 } },
      glass: { pace: { x: 3, y: 4 } },
    };

    const next = clearCustomLayout(customs, "hero");

    expect(next.hero).toBeUndefined();
    expect(next.glass).toEqual(customs.glass);
  });

  test("resolveLayout returns the default again after clearing", () => {
    const customs = storeCustomLayout({}, "hero", { distance: { x: 90, y: 90 } });

    const cleared = clearCustomLayout(customs, "hero");

    expect(resolveLayout("hero", cleared)).toEqual(
      TEMPLATE_STAT_DESIGNS.hero.defaultLayout
    );
  });
});
