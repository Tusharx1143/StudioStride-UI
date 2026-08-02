import { describe, expect, test } from "vitest";
import { TEMPLATE_STAT_DESIGNS, getStatDesign } from "./index";
import { TEMPLATE_FAMILIES } from "../mockData";
import { getChartEntry, isChartSlot } from "../chartRegistry";
import type { ChartSlotId, StatData, StatSlotId, TextSlotId } from "../../types";

const SAMPLE: StatData = {
  distance: 5.24,
  distanceUnit: "km",
  pace: "5:12",
  time: "26:04",
  title: "Morning Run",
};

const TEXT_SLOTS: TextSlotId[] = ["distance", "pace", "time", "title"];

describe("design table coverage", () => {
  test("every template family has a design entry", () => {
    const missing = TEMPLATE_FAMILIES.filter((t) => !TEMPLATE_STAT_DESIGNS[t.id]).map(
      (t) => t.id
    );

    expect(missing).toEqual([]);
  });

  test("every design has at least one positioned slot", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      expect(Object.keys(design.defaultLayout).length, `${id} has no layout`).toBeGreaterThan(0);
    }
  });

  test("every positioned text slot has a matching style", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      for (const slot of Object.keys(design.defaultLayout) as StatSlotId[]) {
        if (slot === "accent" || isChartSlot(slot)) continue;
        expect(design.slots[slot], `${id}.${slot} positioned without a style`).toBeDefined();
      }
    }
  });

  test("every positioned chart slot has a style and a known registry entry", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      for (const slot of Object.keys(design.defaultLayout) as StatSlotId[]) {
        if (!isChartSlot(slot)) continue;
        const style = design.charts?.[slot];
        expect(style, `${id}.${slot} positioned without a chart style`).toBeDefined();
        expect(
          getChartEntry(style!.chart),
          `${id}.${slot} names unknown chart "${style!.chart}"`
        ).not.toBeNull();
      }
    }
  });

  test("every styled chart slot has a position in the default layout", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      for (const slot of Object.keys(design.charts ?? {}) as ChartSlotId[]) {
        expect(
          design.defaultLayout[slot],
          `${id}.${slot} styled but unpositioned`
        ).toBeDefined();
      }
    }
  });

  test("every required chart slot is one the template actually draws", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      for (const slot of design.requires ?? []) {
        expect(
          design.charts?.[slot],
          `${id} requires "${slot}" but never draws it`
        ).toBeDefined();
      }
    }
  });

  test("no template gates itself on decoration", () => {
    // A rule draws from its own style, so requiring one would disable the
    // template forever while looking like a data requirement.
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      for (const slot of design.requires ?? []) {
        const style = design.charts?.[slot];
        if (!style) continue;
        expect(
          getChartEntry(style.chart)?.decorative ?? false,
          `${id} requires decorative slot "${slot}"`
        ).toBe(false);
      }
    }
  });

  test("every styled slot has a position in the default layout", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      for (const slot of TEXT_SLOTS) {
        if (!design.slots[slot]) continue;
        expect(design.defaultLayout[slot], `${id}.${slot} styled but unpositioned`).toBeDefined();
      }
    }
  });

  test("an accent position always comes with both renderers", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      if (!design.defaultLayout.accent) continue;
      expect(design.accentRender, `${id} accent has no DOM renderer`).toBeDefined();
      expect(design.accentDraw, `${id} accent has no canvas painter`).toBeDefined();
    }
  });

  test("accent renderers are only defined where the layout positions them", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      if (!design.accentRender) continue;
      expect(design.defaultLayout.accent, `${id} renders an unpositioned accent`).toBeDefined();
    }
  });

  test("all default positions are on canvas", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      for (const [slot, pos] of Object.entries(design.defaultLayout)) {
        expect(pos!.x, `${id}.${slot}.x`).toBeGreaterThanOrEqual(0);
        expect(pos!.x, `${id}.${slot}.x`).toBeLessThanOrEqual(100);
        expect(pos!.y, `${id}.${slot}.y`).toBeGreaterThanOrEqual(0);
        expect(pos!.y, `${id}.${slot}.y`).toBeLessThanOrEqual(100);
      }
    }
  });

  test("every slot formatter produces a non-empty string", () => {
    for (const [id, design] of Object.entries(TEMPLATE_STAT_DESIGNS)) {
      for (const slot of TEXT_SLOTS) {
        const style = design.slots[slot];
        if (!style) continue;
        expect(style.text(SAMPLE), `${id}.${slot} rendered empty`).not.toBe("");
      }
    }
  });
});

describe("getStatDesign", () => {
  test("returns the requested design", () => {
    expect(getStatDesign("hero")).toBe(TEMPLATE_STAT_DESIGNS.hero);
  });

  test("falls back to the default design for an unknown id", () => {
    expect(getStatDesign("not-a-template")).toBe(TEMPLATE_STAT_DESIGNS.default);
  });
});
