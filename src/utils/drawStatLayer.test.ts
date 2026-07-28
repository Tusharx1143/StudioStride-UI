import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { drawStatLayer } from "./drawStatLayer";
import { TEMPLATE_STAT_DESIGNS } from "../data/templateStatDesigns";
import type { StatData } from "../types";

const SAMPLE: StatData = {
  distance: 5.24,
  distanceUnit: "km",
  pace: "5:12",
  time: "26:04",
  title: "Morning Run",
};

/** Records every 2D context call so a draw pass can run outside a browser. */
function fakeContext() {
  const calls: string[] = [];
  const gradient = { addColorStop: () => {} };
  const target: Record<string, unknown> = {
    measureText: (t: string) => {
      calls.push("measureText");
      return { width: t.length * 6 };
    },
    createLinearGradient: () => {
      calls.push("createLinearGradient");
      return gradient;
    },
  };
  const ctx = new Proxy(target, {
    get(obj, prop: string) {
      if (prop in obj) return obj[prop];
      return (...args: unknown[]) => {
        calls.push(prop);
        return args.length ? undefined : undefined;
      };
    },
    set(obj, prop: string, value) {
      obj[prop] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe("drawStatLayer", () => {
  test("paints every template's default layout without throwing", async () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      const { ctx, calls } = fakeContext();

      await expect(
        drawStatLayer(ctx, { width: 1080, height: 1920 }, id, design.defaultLayout, SAMPLE),
        `${id} threw while drawing`
      ).resolves.toBeUndefined();

      expect(calls.filter((c) => c === "fillText").length, `${id} drew no text`).toBeGreaterThan(0);
    }
  });

  test("draws nothing for a layout with no slots", async () => {
    const { ctx, calls } = fakeContext();

    await drawStatLayer(ctx, { width: 1080, height: 1920 }, "hero", {}, SAMPLE);

    expect(calls.filter((c) => c === "fillText")).toEqual([]);
  });

  test("skips a slot the template has no style for", async () => {
    const { ctx, calls } = fakeContext();

    // glass defines no title slot
    await drawStatLayer(ctx, { width: 1080, height: 1920 }, "glass", { title: { x: 10, y: 10 } }, SAMPLE);

    expect(calls.filter((c) => c === "fillText")).toEqual([]);
  });

  test("every accent painter runs", async () => {
    const withAccent = Object.entries(TEMPLATE_STAT_DESIGNS).filter(
      ([, d]) => d.accentDraw
    );
    expect(withAccent.length).toBeGreaterThan(0);

    for (const [id, design] of withAccent) {
      const { ctx, calls } = fakeContext();

      design.accentDraw!(ctx, { x: 100, y: 200, scale: 2.77 }, SAMPLE);

      expect(calls.length, `${id} accent painted nothing`).toBeGreaterThan(0);
    }
  });
});

describe("accent DOM renderers", () => {
  test("every accent renderer produces markup", () => {
    const withAccent = Object.entries(TEMPLATE_STAT_DESIGNS).filter(
      ([, d]) => d.accentRender
    );
    expect(withAccent.length).toBeGreaterThan(0);

    for (const [id, design] of withAccent) {
      const markup = renderToStaticMarkup(design.accentRender!(SAMPLE) as never);
      expect(markup, `${id} accent rendered empty`).not.toBe("");
    }
  });
});
