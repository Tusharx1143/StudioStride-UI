/**
 * Tests for contentService — StorableSlotStyle → TemplateStatDesign resolution.
 *
 * These tests verify the runtime conversion of Firestore-safe types to
 * the runtime types used by the editor and stat layer.
 */

import { describe, test, expect } from "vitest";
import type { StorableTemplateStatDesign } from "../types/content";
import { resolveStatDesign, slugify } from "../services/contentService";

describe("slugify", () => {
  test("collapses whitespace to underscores", () => {
    expect(slugify("Golden Hour Trail")).toBe("golden_hour_trail");
  });

  test("strips characters illegal in a Firestore document id", () => {
    // A slash would have made the id an invalid document path.
    expect(slugify("Trail / Road")).toBe("trail_road");
    expect(slugify("Sunset!!")).toBe("sunset");
  });

  test("never returns an empty id", () => {
    expect(slugify("")).toBe("item");
    expect(slugify("!!!")).toBe("item");
  });

  test("does not leave leading or trailing underscores", () => {
    expect(slugify("  Neon  ")).toBe("neon");
  });
});

describe("resolveStatDesign", () => {
  const minimalStorable: StorableTemplateStatDesign = {
    templateFamilyId: "test_template",
    slots: {
      distance: {
        textFormatter: "dist2",
        fontFamily: "'Archivo', sans-serif",
        fontSize: 36,
        fontWeight: 900,
        color: "#FFFFFF",
        letterSpacing: -1,
        shadow: { color: "rgba(0,0,0,0.5)", blur: 14, y: 3 },
      },
      pace: {
        textFormatter: "pace",
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
        fontWeight: 500,
        color: "rgba(255,255,255,0.7)",
      },
    },
    defaultLayout: {
      distance: { x: 6, y: 58 },
      pace: { x: 6, y: 68 },
    },
    accentType: "none",
  };

  test("resolves formatter strings to functions", () => {
    const resolved = resolveStatDesign(minimalStorable);

    expect(resolved.slots.distance?.text).toBeDefined();
    expect(typeof resolved.slots.distance?.text).toBe("function");

    const result = resolved.slots.distance!.text({
      distance: 5.24,
      distanceUnit: "km",
      pace: "5:12",
      time: "26:04",
      title: "Test",
    });
    expect(result).toBe("5.24");
  });

  test("preserves defaultLayout", () => {
    const resolved = resolveStatDesign(minimalStorable);
    expect(resolved.defaultLayout).toEqual(minimalStorable.defaultLayout);
  });

  test("does not attach accentRender/accentDraw when accentType is none", () => {
    const resolved = resolveStatDesign(minimalStorable);
    expect(resolved.accentRender).toBeUndefined();
    expect(resolved.accentDraw).toBeUndefined();
  });

  test("attaches accent render/draw when accentType is set", () => {
    const withAccent: StorableTemplateStatDesign = {
      ...minimalStorable,
      accentType: "lap_bars",
    };
    const resolved = resolveStatDesign(withAccent);
    expect(resolved.accentRender).toBeDefined();
    expect(resolved.accentDraw).toBeDefined();
  });

  test("preserves slot background and shadow config", () => {
    const withBg: StorableTemplateStatDesign = {
      ...minimalStorable,
      slots: {
        distance: {
          ...minimalStorable.slots.distance!,
          bg: { fill: "rgba(0,0,0,0.6)", radius: 12, padX: 16, padY: 8 },
          shadow: { color: "rgba(0,0,0,0.45)", blur: 16, y: 6 },
        },
      },
    };
    const resolved = resolveStatDesign(withBg);
    expect(resolved.slots.distance?.bg).toEqual(withBg.slots.distance!.bg);
    expect(resolved.slots.distance?.shadow).toEqual(withBg.slots.distance!.shadow);
  });

  test("handles undefined slots gracefully", () => {
    const empty: StorableTemplateStatDesign = {
      templateFamilyId: "empty",
      slots: {},
      defaultLayout: {},
      accentType: "none",
    };
    const resolved = resolveStatDesign(empty);
    expect(resolved.slots).toEqual({});
    expect(resolved.defaultLayout).toEqual({});
  });
});
