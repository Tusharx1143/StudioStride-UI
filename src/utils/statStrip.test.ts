import { beforeEach, describe, expect, test } from "vitest";
import {
  STRIP_SEEN_KEY,
  markStripSeen,
  placeStrip,
  shouldAutoOpenStrip,
} from "./statStrip";

describe("placeStrip", () => {
  const bounds = { min: 2, max: 98 };
  const stripHeight = 14;
  const gap = 2;

  test("sits above the slot when there is room", () => {
    const placement = placeStrip({ slotY: 60, slotHeight: 8, stripHeight, gap, bounds });

    expect(placement).toEqual({ top: 60 - stripHeight - gap, side: "above" });
  });

  test("flips below the slot when the slot is near the top", () => {
    const placement = placeStrip({ slotY: 5, slotHeight: 8, stripHeight, gap, bounds });

    expect(placement).toEqual({ top: 5 + 8 + gap, side: "below" });
  });

  test("clamps so the strip never runs past the bottom bound", () => {
    const placement = placeStrip({ slotY: 4, slotHeight: 80, stripHeight, gap, bounds });

    expect(placement.top).toBeLessThanOrEqual(bounds.max - stripHeight);
    expect(placement.top).toBeGreaterThanOrEqual(bounds.min);
  });

  test("keeps the strip inside the bounds for every slot position", () => {
    for (let slotY = 0; slotY <= 100; slotY += 5) {
      const { top } = placeStrip({ slotY, slotHeight: 8, stripHeight, gap, bounds });

      expect(top, `slotY=${slotY}`).toBeGreaterThanOrEqual(bounds.min);
      expect(top + stripHeight, `slotY=${slotY}`).toBeLessThanOrEqual(bounds.max);
    }
  });
});

describe("shouldAutoOpenStrip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("opens the first time the editor has a template", () => {
    expect(shouldAutoOpenStrip(true)).toBe(true);
  });

  test("stays shut once the strip has been seen", () => {
    markStripSeen();

    expect(shouldAutoOpenStrip(true)).toBe(false);
  });

  test("stays shut when there is no template", () => {
    expect(shouldAutoOpenStrip(false)).toBe(false);
  });

  test("marking seen does not open it for a template-less editor", () => {
    markStripSeen();

    expect(shouldAutoOpenStrip(false)).toBe(false);
  });

  test("records the seen flag under a stable key", () => {
    markStripSeen();

    expect(localStorage.getItem(STRIP_SEEN_KEY)).toBeTruthy();
  });
});
