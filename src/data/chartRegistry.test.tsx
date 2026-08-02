import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { CHART_REGISTRY, getChartEntry, isChartSlot } from "./chartRegistry";
import { fakeContext } from "../test/fakeContext";
import { toRouteGeometry } from "../utils/routeGeometry";
import type { ChartStyle, StatData } from "../types";

const BARE: StatData = {
  distance: 5.24,
  distanceUnit: "km",
  pace: "5:12",
  time: "26:04",
  title: "Morning Run",
};

const WITH_ROUTE: StatData = {
  ...BARE,
  route: toRouteGeometry([
    [45.0, -73.6],
    [45.1, -73.5],
    [45.05, -73.4],
  ])!,
};

const ROUTE_STYLE: ChartStyle = {
  chart: "route_trace",
  width: 120,
  height: 120,
  color: "#FFFFFF",
  trackColor: "rgba(0,0,0,0.55)",
  strokeWidth: 3,
};

describe("isChartSlot", () => {
  test("recognises the chart slot ids", () => {
    expect(isChartSlot("route")).toBe(true);
    expect(isChartSlot("splits")).toBe(true);
  });

  test("rejects text, accent and metric slots", () => {
    expect(isChartSlot("distance")).toBe(false);
    expect(isChartSlot("accent")).toBe(false);
    expect(isChartSlot("metric:avg_hr")).toBe(false);
  });
});

describe("CHART_REGISTRY", () => {
  test("every entry exposes all three members", () => {
    for (const [key, entry] of Object.entries(CHART_REGISTRY)) {
      expect(typeof entry.available, `${key}.available`).toBe("function");
      expect(typeof entry.render, `${key}.render`).toBe("function");
      expect(typeof entry.draw, `${key}.draw`).toBe("function");
    }
  });

  test("no data chart is available on an activity carrying no series", () => {
    for (const [key, entry] of Object.entries(CHART_REGISTRY)) {
      if (entry.decorative) continue;
      expect(entry.available(BARE), `${key} claimed availability`).toBe(false);
    }
  });

  test("decorative entries are always available", () => {
    const decorative = Object.entries(CHART_REGISTRY).filter(([, e]) => e.decorative);
    expect(decorative.length).toBeGreaterThan(0);

    for (const [key, entry] of decorative) {
      expect(entry.available(BARE), `${key} gated itself on data`).toBe(true);
    }
  });
});

describe("getChartEntry", () => {
  test("returns null for an unknown key rather than throwing", () => {
    expect(getChartEntry("not_a_chart")).toBeNull();
  });
});

describe("route_trace", () => {
  test("is available only when the activity carries a route", () => {
    const entry = getChartEntry("route_trace")!;
    expect(entry.available(BARE)).toBe(false);
    expect(entry.available(WITH_ROUTE)).toBe(true);
  });

  test("renders a polyline through every point", () => {
    const entry = getChartEntry("route_trace")!;
    const markup = renderToStaticMarkup(
      entry.render(WITH_ROUTE, ROUTE_STYLE) as ReactElement
    );

    const points = markup.match(/points="([^"]+)"/);
    expect(points).not.toBeNull();
    expect(points![1].trim().split(/\s+/)).toHaveLength(
      WITH_ROUTE.route!.points.length
    );
  });

  test("draws the casing stroke beneath the main stroke", () => {
    const entry = getChartEntry("route_trace")!;
    const fake = fakeContext();

    entry.draw(fake.ctx, { x: 10, y: 20, scale: 2 }, WITH_ROUTE, {
      ...ROUTE_STYLE,
      options: { casing: true },
    });

    const widths = fake.argsFor("set:lineWidth").map(([w]) => w as number);
    expect(fake.countOf("stroke")).toBe(2);
    // The casing is laid down first and is the wider of the two.
    expect(widths[0]).toBeGreaterThan(widths[1]);
  });

  test("skips the casing when the option is off", () => {
    const entry = getChartEntry("route_trace")!;
    const fake = fakeContext();

    entry.draw(fake.ctx, { x: 0, y: 0, scale: 1 }, WITH_ROUTE, ROUTE_STYLE);

    expect(fake.countOf("stroke")).toBe(1);
  });

  test("renders nothing when the activity has no route", () => {
    const entry = getChartEntry("route_trace")!;
    expect(entry.render(BARE, ROUTE_STYLE)).toBeNull();
  });
});

const WITH_SPLITS: StatData = {
  ...BARE,
  splits: [360, 372, 350, 365].map((pace, i) => ({
    index: i + 1,
    distanceMeters: 1000,
    elapsed: pace,
    paceSecondsPerKm: pace,
  })),
};

const SPLITS_STYLE: ChartStyle = {
  chart: "splits_bars",
  width: 160,
  height: 48,
  color: "rgba(255,255,255,0.3)",
  accentColor: "#F4E409",
};

describe("splits_bars", () => {
  test("is available only when the activity carries at least two splits", () => {
    const entry = getChartEntry("splits_bars")!;
    expect(entry.available(BARE)).toBe(false);
    expect(entry.available({ ...BARE, splits: [WITH_SPLITS.splits![0]] })).toBe(false);
    expect(entry.available(WITH_SPLITS)).toBe(true);
  });

  test("renders one rect per split", () => {
    const entry = getChartEntry("splits_bars")!;
    const markup = renderToStaticMarkup(
      entry.render(WITH_SPLITS, SPLITS_STYLE) as ReactElement
    );

    expect(markup.match(/<rect/g)).toHaveLength(4);
  });

  test("highlights the fastest split when asked", () => {
    const entry = getChartEntry("splits_bars")!;
    const markup = renderToStaticMarkup(
      entry.render(WITH_SPLITS, {
        ...SPLITS_STYLE,
        options: { highlightFastest: true },
      }) as ReactElement
    );

    expect(markup).toContain("#F4E409");
  });

  test("leaves every bar the base colour when highlighting is off", () => {
    const entry = getChartEntry("splits_bars")!;
    const markup = renderToStaticMarkup(
      entry.render(WITH_SPLITS, SPLITS_STYLE) as ReactElement
    );

    expect(markup).not.toContain("#F4E409");
  });

  test("fills one rect per split on canvas", () => {
    const entry = getChartEntry("splits_bars")!;
    const fake = fakeContext();

    entry.draw(fake.ctx, { x: 0, y: 0, scale: 1 }, WITH_SPLITS, SPLITS_STYLE);

    expect(fake.countOf("fillRect")).toBe(4);
  });

  test("honours maxBars by sampling rather than truncating", () => {
    const entry = getChartEntry("splits_bars")!;
    const fake = fakeContext();
    const many: StatData = {
      ...BARE,
      splits: Array.from({ length: 20 }, (_, i) => ({
        index: i + 1,
        distanceMeters: 1000,
        elapsed: 360 + i,
        paceSecondsPerKm: 360 + i,
      })),
    };

    entry.draw(fake.ctx, { x: 0, y: 0, scale: 1 }, many, {
      ...SPLITS_STYLE,
      options: { maxBars: 8 },
    });

    expect(fake.countOf("fillRect")).toBe(8);
  });

  test("takes its colour from the style, not a light-on-dark default", () => {
    // Bib is ink on cream. If a default leaks in anywhere, this catches it.
    const entry = getChartEntry("splits_bars")!;
    const fake = fakeContext();

    entry.draw(fake.ctx, { x: 0, y: 0, scale: 1 }, WITH_SPLITS, {
      ...SPLITS_STYLE,
      color: "#16150F",
    });

    const fills = fake.argsFor("set:fillStyle").map(([c]) => c as string);
    expect(fills.every((c) => c === "#16150F")).toBe(true);
  });

  test("renders nothing when the activity has no splits", () => {
    const entry = getChartEntry("splits_bars")!;
    expect(entry.render(BARE, SPLITS_STYLE)).toBeNull();
  });
});

const RULE_STYLE: ChartStyle = {
  chart: "paper_rule",
  width: 320,
  height: 4,
  color: "#C9C2B1",
  strokeWidth: 1,
  options: { dash: 5, gap: 4 },
};

describe("paper_rule", () => {
  test("is always available — it draws from its own style, not the activity", () => {
    const entry = getChartEntry("paper_rule")!;
    expect(entry.available(BARE)).toBe(true);
  });

  test("renders a dashed line spanning the box", () => {
    const entry = getChartEntry("paper_rule")!;
    const markup = renderToStaticMarkup(entry.render(BARE, RULE_STYLE) as ReactElement);

    expect(markup).toContain("<line");
    expect(markup).toContain('stroke-dasharray="5 4"');
    expect(markup).toContain('x2="320"');
  });

  test("omits the dash array when dash is zero, giving a solid rule", () => {
    const entry = getChartEntry("paper_rule")!;
    const markup = renderToStaticMarkup(
      entry.render(BARE, { ...RULE_STYLE, options: { dash: 0 } }) as ReactElement
    );

    expect(markup).not.toContain("stroke-dasharray");
  });

  test("strokes one dashed line on canvas", () => {
    const entry = getChartEntry("paper_rule")!;
    const fake = fakeContext();

    entry.draw(fake.ctx, { x: 0, y: 0, scale: 1 }, BARE, RULE_STYLE);

    expect(fake.countOf("stroke")).toBe(1);
    expect(fake.argsFor("setLineDash")[0][0]).toEqual([5, 4]);
  });

  test("clears the dash pattern so it cannot leak into the next slot", () => {
    const entry = getChartEntry("paper_rule")!;
    const fake = fakeContext();

    entry.draw(fake.ctx, { x: 0, y: 0, scale: 1 }, BARE, RULE_STYLE);

    // Last call must reset, or every stroke drawn after this one is dashed.
    const dashes = fake.argsFor("setLineDash");
    expect(dashes[dashes.length - 1][0]).toEqual([]);
  });

  test("takes its colour from the style", () => {
    const entry = getChartEntry("paper_rule")!;
    const fake = fakeContext();

    entry.draw(fake.ctx, { x: 0, y: 0, scale: 1 }, BARE, RULE_STYLE);

    expect(fake.props.strokeStyle).toBe("#C9C2B1");
  });
});
