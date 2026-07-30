import { describe, expect, test } from "vitest";
import {
  availableMetrics,
  isMetricSlot,
  metricForSlot,
  metricIdOf,
  metricSlot,
  metricsByCategory,
  pruneUnavailableMetricSlots,
  resolveSlotStyle,
} from "./metricSlots";
import type { MetricValue, SlotStyle, StatData, TemplateStatDesign } from "../types";

const HR: MetricValue = {
  id: "avg_hr",
  label: "Avg Heart Rate",
  value: "154",
  unit: "BPM",
  category: "Performance",
  icon: "❤️",
};

const ELEV: MetricValue = {
  id: "elev_gain",
  label: "Elevation Gain",
  value: "142",
  unit: "m",
  category: "Elevation",
  icon: "⛰️",
};

const KUDOS: MetricValue = {
  id: "kudos",
  label: "Kudos",
  value: "128",
  unit: "👍",
  category: "Achievements",
  icon: "👏",
};

const DATA: StatData = {
  distance: 8.4,
  distanceUnit: "km",
  pace: "6:12",
  time: "52:18",
  title: "Morning Run",
  metrics: { avg_hr: HR, elev_gain: ELEV, kudos: KUDOS },
};

const PACE_STYLE: SlotStyle = {
  text: (d) => d.pace,
  fontFamily: "Archivo",
  fontSize: 24,
  fontWeight: 700,
  color: "#FFFFFF",
};

const DISTANCE_STYLE: SlotStyle = {
  text: (d) => String(d.distance),
  fontFamily: "Archivo",
  fontSize: 72,
  fontWeight: 900,
  color: "#FFFFFF",
};

const DESIGN: TemplateStatDesign = {
  slots: { pace: PACE_STYLE, distance: DISTANCE_STYLE },
  defaultLayout: {},
};

describe("slot id encoding", () => {
  test("round-trips a metric id", () => {
    const slot = metricSlot("avg_hr");
    expect(slot).toBe("metric:avg_hr");
    expect(isMetricSlot(slot)).toBe(true);
    expect(metricIdOf(slot)).toBe("avg_hr");
  });

  test("core slots are not metric slots", () => {
    for (const slot of ["distance", "pace", "time", "title", "accent"] as const) {
      expect(isMetricSlot(slot)).toBe(false);
      expect(metricIdOf(slot)).toBeNull();
    }
  });

  test("does not mistake a core slot whose name merely contains 'metric'", () => {
    expect(isMetricSlot("metrics" as never)).toBe(false);
  });
});

describe("metricForSlot", () => {
  test("finds a metric the activity carries", () => {
    expect(metricForSlot(metricSlot("avg_hr"), DATA)).toEqual(HR);
  });

  test("is null for a metric the activity lacks", () => {
    expect(metricForSlot(metricSlot("power"), DATA)).toBeNull();
  });

  test("is null when the activity has no metrics at all", () => {
    const bare: StatData = { ...DATA, metrics: undefined };
    expect(metricForSlot(metricSlot("avg_hr"), bare)).toBeNull();
  });
});

describe("resolveSlotStyle", () => {
  test("returns the authored style for a core slot", () => {
    expect(resolveSlotStyle(DESIGN, "pace", DATA)).toBe(PACE_STYLE);
  });

  test("is null for a core slot this template does not use", () => {
    expect(resolveSlotStyle(DESIGN, "time", DATA)).toBeNull();
  });

  test("gives a metric the template's secondary styling, not its hero styling", () => {
    const style = resolveSlotStyle(DESIGN, metricSlot("avg_hr"), DATA)!;
    expect(style.fontSize).toBe(PACE_STYLE.fontSize);
    expect(style.fontWeight).toBe(PACE_STYLE.fontWeight);
    expect(style.fontSize).not.toBe(DISTANCE_STYLE.fontSize);
  });

  test("typesets the metric's own value and unit", () => {
    const style = resolveSlotStyle(DESIGN, metricSlot("avg_hr"), DATA)!;
    expect(style.text(DATA)).toBe("154");
    expect(style.suffix?.(DATA)).toBe("BPM");
  });

  test("borrows the smallest authored text, not the first in a list", () => {
    // Slot order in the object is deliberately hero-first here.
    const design: TemplateStatDesign = {
      slots: { distance: DISTANCE_STYLE, pace: PACE_STYLE },
      defaultLayout: {},
    };
    const style = resolveSlotStyle(design, metricSlot("avg_hr"), DATA)!;
    expect(style.fontSize).toBe(PACE_STYLE.fontSize);
  });

  test("clamps a hero-sized donor so a metric never shouts over the stats", () => {
    // Hero authors only a giant distance; the chip must stay supporting.
    const design: TemplateStatDesign = { slots: { distance: DISTANCE_STYLE }, defaultLayout: {} };
    const style = resolveSlotStyle(design, metricSlot("avg_hr"), DATA)!;
    expect(style.fontSize).toBeLessThan(DISTANCE_STYLE.fontSize);
    expect(style.fontSize).toBe(28);
  });

  test("is null for a metric the activity does not have — no blank chip", () => {
    expect(resolveSlotStyle(DESIGN, metricSlot("power"), DATA)).toBeNull();
  });

  test("is null when the template authored no text slots to borrow from", () => {
    const design: TemplateStatDesign = { slots: {}, defaultLayout: {} };
    expect(resolveSlotStyle(design, metricSlot("avg_hr"), DATA)).toBeNull();
  });
});

describe("availableMetrics", () => {
  test("lists only what the activity carries", () => {
    expect(availableMetrics(DATA).map((m) => m.id)).toEqual(["avg_hr", "elev_gain", "kudos"]);
  });

  test("is empty for an activity with no extra metrics", () => {
    expect(availableMetrics({ ...DATA, metrics: undefined })).toEqual([]);
  });

  test("orders by category, then label", () => {
    const categories = availableMetrics(DATA).map((m) => m.category);
    expect(categories).toEqual(["Performance", "Elevation", "Achievements"]);
  });
});

describe("metricsByCategory", () => {
  test("groups without emitting empty categories", () => {
    const groups = metricsByCategory(DATA);
    expect(groups.map((g) => g.category)).toEqual([
      "Performance",
      "Elevation",
      "Achievements",
    ]);
    expect(groups.every((g) => g.metrics.length > 0)).toBe(true);
  });

  test("is empty rather than a list of empty groups", () => {
    expect(metricsByCategory({ ...DATA, metrics: undefined })).toEqual([]);
  });
});

describe("pruneUnavailableMetricSlots", () => {
  test("keeps core slots untouched", () => {
    const layout = { distance: { x: 1, y: 2 }, pace: { x: 3, y: 4 } };
    expect(pruneUnavailableMetricSlots(layout, DATA)).toEqual(layout);
  });

  test("keeps metric slots the activity can fill", () => {
    const layout = { distance: { x: 1, y: 2 }, "metric:avg_hr": { x: 5, y: 6 } };
    expect(pruneUnavailableMetricSlots(layout, DATA)).toEqual(layout);
  });

  test("drops a metric slot this activity cannot fill", () => {
    // A cycling layout reused on a treadmill run.
    const layout = { distance: { x: 1, y: 2 }, "metric:power": { x: 5, y: 6 } };
    expect(pruneUnavailableMetricSlots(layout, DATA)).toEqual({ distance: { x: 1, y: 2 } });
  });

  test("drops every metric slot when the activity has no metrics", () => {
    const layout = { pace: { x: 1, y: 2 }, "metric:avg_hr": { x: 5, y: 6 } };
    expect(pruneUnavailableMetricSlots(layout, { ...DATA, metrics: undefined })).toEqual({
      pace: { x: 1, y: 2 },
    });
  });
});
