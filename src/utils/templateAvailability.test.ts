import { describe, expect, test } from "vitest";
import { isTemplateAvailable, unavailableTemplateIds } from "./templateAvailability";
import { toRouteGeometry } from "./routeGeometry";
import type { SplitSample, StatData, TemplateStatDesign } from "../types";

const BARE: StatData = {
  distance: 5.24,
  distanceUnit: "km",
  pace: "5:12",
  time: "26:04",
  title: "Treadmill",
};

const SPLITS: SplitSample[] = [360, 372, 350].map((pace, i) => ({
  index: i + 1,
  distanceMeters: 1000,
  elapsed: pace,
  paceSecondsPerKm: pace,
}));

const WITH_ROUTE: StatData = {
  ...BARE,
  route: toRouteGeometry([
    [45.0, -73.6],
    [45.1, -73.5],
    [45.05, -73.4],
  ])!,
};

const WITH_BOTH: StatData = { ...WITH_ROUTE, splits: SPLITS };

const ROUTE_ONLY: TemplateStatDesign = {
  slots: {},
  charts: {
    route: { chart: "route_trace", width: 100, height: 100, color: "#FFF" },
  },
  requires: ["route"],
  defaultLayout: { route: { x: 10, y: 10 } },
};

describe("isTemplateAvailable", () => {
  test("a template requiring nothing is always available", () => {
    const design: TemplateStatDesign = { slots: {}, defaultLayout: {} };
    expect(isTemplateAvailable(design, BARE)).toBe(true);
  });

  test("an empty requires list is treated as requiring nothing", () => {
    const design: TemplateStatDesign = { slots: {}, requires: [], defaultLayout: {} };
    expect(isTemplateAvailable(design, BARE)).toBe(true);
  });

  test("a required chart gates the template", () => {
    expect(isTemplateAvailable(ROUTE_ONLY, BARE)).toBe(false);
    expect(isTemplateAvailable(ROUTE_ONLY, WITH_ROUTE)).toBe(true);
  });

  test("every requirement must be met, not just one", () => {
    const both: TemplateStatDesign = {
      ...ROUTE_ONLY,
      charts: {
        ...ROUTE_ONLY.charts,
        splits: { chart: "splits_bars", width: 100, height: 40, color: "#FFF" },
      },
      requires: ["route", "splits"],
    };

    expect(isTemplateAvailable(both, WITH_ROUTE)).toBe(false);
    expect(isTemplateAvailable(both, WITH_BOTH)).toBe(true);
  });

  test("requiring a slot the template never draws is unavailable, not a crash", () => {
    const broken: TemplateStatDesign = { slots: {}, requires: ["route"], defaultLayout: {} };
    expect(isTemplateAvailable(broken, WITH_ROUTE)).toBe(false);
  });

  test("requiring a chart the registry does not have is unavailable", () => {
    const future: TemplateStatDesign = {
      slots: {},
      charts: {
        route: { chart: "not_shipped_yet", width: 100, height: 100, color: "#FFF" },
      },
      requires: ["route"],
      defaultLayout: { route: { x: 10, y: 10 } },
    };

    expect(isTemplateAvailable(future, WITH_ROUTE)).toBe(false);
  });
});

describe("unavailableTemplateIds", () => {
  test("names the chart templates a treadmill run cannot use", () => {
    const ids = unavailableTemplateIds(BARE);

    expect(ids).toContain("trace");
    expect(ids).toContain("tempo");
    expect(ids).toContain("datanerd");
    expect(ids).toContain("bib");
  });

  test("leaves the text-only templates alone", () => {
    const ids = unavailableTemplateIds(BARE);

    expect(ids).not.toContain("hero");
    expect(ids).not.toContain("minimal");
    expect(ids).not.toContain("editorial");
  });

  test("a GPS run with splits unlocks all four", () => {
    const ids = unavailableTemplateIds(WITH_BOTH);

    expect(ids).not.toContain("trace");
    expect(ids).not.toContain("tempo");
    expect(ids).not.toContain("datanerd");
    expect(ids).not.toContain("bib");
  });

  test("a GPS run without splits unlocks only the route template", () => {
    const ids = unavailableTemplateIds(WITH_ROUTE);

    expect(ids).not.toContain("trace");
    expect(ids).toContain("tempo");
    expect(ids).toContain("datanerd");
    expect(ids).toContain("bib");
  });
});
