/**
 * Tests for accentRegistry — every accent has both render and draw functions.
 */

import { describe, test, expect } from "vitest";
import { ACCENT_REGISTRY, ACCENT_OPTIONS } from "./accentRegistry";
import type { SlotBox, StatData } from "../types";

const SAMPLE_DATA: StatData = {
  distance: 5.24,
  distanceUnit: "km",
  pace: "5:12",
  time: "26:04",
  title: "Morning Run",
};

const SAMPLE_BOX: SlotBox = { x: 0, y: 0, scale: 1 };

describe("accentRegistry", () => {
  test("every ACCENT_OPTIONS entry (except 'none') has a registry entry", () => {
    for (const opt of ACCENT_OPTIONS) {
      if (opt.value === "none") continue;
      expect(ACCENT_REGISTRY[opt.value]).toBeDefined();
    }
  });

  test("all registered accents provide a render function that returns ReactNode", () => {
    for (const [key, entry] of Object.entries(ACCENT_REGISTRY)) {
      const result = entry.render(SAMPLE_DATA);
      // render returns ReactNode — not null/undefined
      expect(result).toBeDefined();
    }
  });

  test("all registered accents provide a draw function", () => {
    for (const [key, entry] of Object.entries(ACCENT_REGISTRY)) {
      expect(typeof entry.draw).toBe("function");
    }
  });

  test("draw functions accept canvas context and slot box without throwing", () => {
    // Create a minimal canvas mock
    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      globalAlpha: 1,
      lineCap: "butt",
      lineWidth: 1,
      font: "",
      textBaseline: "alphabetic" as CanvasTextBaseline,
      textAlign: "left" as CanvasTextAlign,
      shadowColor: "",
      shadowBlur: 0,
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      arcTo: () => {},
      rect: () => {},
      fillRect: () => {},
      fillText: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} } as unknown as CanvasGradient),
    } as unknown as CanvasRenderingContext2D;

    for (const [key, entry] of Object.entries(ACCENT_REGISTRY)) {
      expect(() => entry.draw(ctx, SAMPLE_BOX, SAMPLE_DATA)).not.toThrow();
    }
  });
});
