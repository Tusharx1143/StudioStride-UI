import { describe, expect, test } from "vitest";
import { scaleFilter } from "./filterScale";
import { LENS_FILTER_MAP } from "../data/mockData";

describe("scaleFilter", () => {
  test("returns the base untouched at full strength", () => {
    expect(scaleFilter("contrast(1.3) saturate(1.2)", 1)).toBe("contrast(1.3) saturate(1.2)");
  });

  test("returns no filter at zero — 'None' means none", () => {
    expect(scaleFilter("contrast(1.3) saturate(1.2)", 0)).toBe("");
  });

  test("never invents a filter from an empty base", () => {
    // The old slider wrote contrast/saturate when nothing was selected.
    expect(scaleFilter("", 0.5)).toBe("");
    expect(scaleFilter("", 1)).toBe("");
  });

  test("interpolates multiplicative functions toward 1", () => {
    expect(scaleFilter("contrast(1.5)", 0.5)).toBe("contrast(1.25)");
    expect(scaleFilter("brightness(0.8)", 0.5)).toBe("brightness(0.9)");
    expect(scaleFilter("saturate(2)", 0.25)).toBe("saturate(1.25)");
  });

  test("interpolates additive functions toward 0", () => {
    expect(scaleFilter("sepia(0.4)", 0.5)).toBe("sepia(0.2)");
    expect(scaleFilter("grayscale(1)", 0.25)).toBe("grayscale(0.25)");
  });

  test("scales hue-rotate toward 0deg, keeping the unit and sign", () => {
    expect(scaleFilter("hue-rotate(-15deg)", 0.5)).toBe("hue-rotate(-7.5deg)");
    expect(scaleFilter("hue-rotate(90deg)", 0)).toBe("");
  });

  test("scales blur toward 0px", () => {
    expect(scaleFilter("blur(4px)", 0.5)).toBe("blur(2px)");
  });

  test("treats percentages on their own scale", () => {
    expect(scaleFilter("contrast(150%)", 0.5)).toBe("contrast(125%)");
    expect(scaleFilter("sepia(40%)", 0.5)).toBe("sepia(20%)");
  });

  test("handles a multi-function lens as a unit", () => {
    expect(scaleFilter("contrast(1.3) brightness(1.1) hue-rotate(-15deg)", 0.5)).toBe(
      "contrast(1.15) brightness(1.05) hue-rotate(-7.5deg)"
    );
  });

  test("clamps out-of-range amounts", () => {
    expect(scaleFilter("contrast(1.5)", 2)).toBe("contrast(1.5)");
    expect(scaleFilter("contrast(1.5)", -1)).toBe("");
    expect(scaleFilter("contrast(1.5)", NaN)).toBe("contrast(1.5)");
  });

  test("collapses to no filter when every function lands on identity", () => {
    expect(scaleFilter("contrast(1) saturate(1)", 0.5)).toBe("");
  });

  test("does not emit float noise", () => {
    expect(scaleFilter("contrast(1.15)", 0.5)).toBe("contrast(1.075)");
    expect(scaleFilter("contrast(1.3)", 0.85)).not.toMatch(/\d{8}/);
  });

  test("every shipped lens scales without producing garbage", () => {
    for (const [id, base] of Object.entries(LENS_FILTER_MAP)) {
      for (const amount of [0, 0.25, 0.5, 0.85, 1]) {
        const out = scaleFilter(base, amount);
        expect(out, `${id} @ ${amount}`).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  test("is monotonic — more intensity never means less effect", () => {
    const base = "contrast(1.4)";
    const values = [0.2, 0.4, 0.6, 0.8, 1].map((t) =>
      Number(/contrast\(([\d.]+)\)/.exec(scaleFilter(base, t))![1])
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});
