import { describe, expect, test } from "vitest";
import {
  buildRecap,
  formatTotalTime,
  periodStart,
  recapPace,
  recapSummary,
  recapTitle,
  recapToStatData,
} from "./recap";
import type { UnifiedActivity } from "../sources/types";

const NOW = new Date("2026-07-30T12:00:00Z"); // a Thursday

function activity(
  id: string,
  daysAgo: number,
  distanceMeters: number,
  movingTime: number,
  opts: { route?: boolean; elevGain?: string } = {}
): UnifiedActivity {
  const date = new Date(NOW.getTime() - daysAgo * 24 * 3600_000).toISOString();

  return {
    id,
    sourceId: "mock",
    title: id,
    subtitle: "",
    type: "Run",
    iconType: "activity",
    displayDistance: "",
    displayDistanceUnit: "km",
    displayTime: "",
    displayPace: "",
    displayTimeAgo: "",
    date,
    distanceMeters,
    movingTime,
    ...(opts.route ? { route: { points: [[0, 0]] } as never } : {}),
    toStatData: () => ({
      distance: 0,
      distanceUnit: "km",
      pace: "",
      time: "",
      title: id,
      metrics: opts.elevGain
        ? {
            elev_gain: {
              id: "elev_gain",
              label: "Elevation Gain",
              value: opts.elevGain,
              unit: "m",
              category: "Elevation",
              icon: "⛰️",
            },
          }
        : undefined,
    }),
  };
}

describe("periodStart", () => {
  test("a week starts on Monday", () => {
    const start = periodStart("week", NOW);
    expect(start.getDay()).toBe(1);
    expect(start.getHours()).toBe(0);
  });

  test("a month starts on the first", () => {
    const start = periodStart("month", NOW);
    expect(start.getDate()).toBe(1);
  });
});

describe("buildRecap", () => {
  test("counts only activities inside the window", () => {
    const recap = buildRecap(
      [activity("in", 1, 5000, 1800), activity("old", 30, 9000, 3000)],
      "week",
      NOW
    );

    expect(recap.activityCount).toBe(1);
    expect(recap.totalDistanceMeters).toBe(5000);
  });

  test("sums distance and moving time", () => {
    const recap = buildRecap(
      [activity("a", 0, 5000, 1800), activity("b", 1, 8000, 2700)],
      "week",
      NOW
    );

    expect(recap.totalDistanceMeters).toBe(13000);
    expect(recap.totalMovingSeconds).toBe(4500);
  });

  test("finds the longest activity", () => {
    const recap = buildRecap(
      [activity("short", 0, 5000, 1800), activity("long", 1, 21000, 7200)],
      "week",
      NOW
    );

    expect(recap.longest?.id).toBe("long");
  });

  test("has no longest when nothing covered any distance", () => {
    const recap = buildRecap([activity("gym", 0, 0, 3600)], "week", NOW);
    expect(recap.longest).toBeNull();
  });

  test("collects only activities that have a route", () => {
    const recap = buildRecap(
      [activity("gps", 0, 5000, 1800, { route: true }), activity("treadmill", 1, 5000, 1800)],
      "week",
      NOW
    );

    expect(recap.withRoutes.map((a) => a.id)).toEqual(["gps"]);
  });

  test("ignores future-dated activities from clock skew", () => {
    const future = activity("future", -3, 9000, 3000);
    expect(buildRecap([future], "week", NOW).activityCount).toBe(0);
  });

  test("sorts newest first", () => {
    const recap = buildRecap(
      [activity("older", 2, 1000, 600), activity("newer", 0, 1000, 600)],
      "week",
      NOW
    );

    expect(recap.activities.map((a) => a.id)).toEqual(["newer", "older"]);
  });

  test("an empty week is zeroed, not NaN", () => {
    const recap = buildRecap([], "week", NOW);
    expect(recap.activityCount).toBe(0);
    expect(recap.totalDistanceMeters).toBe(0);
    expect(recap.longest).toBeNull();
  });
});

describe("formatTotalTime", () => {
  test("shows hours and minutes", () => {
    expect(formatTotalTime(3600 * 5 + 60 * 42)).toBe("5h 42m");
  });

  test("drops the hour when under one", () => {
    expect(formatTotalTime(60 * 42)).toBe("42m");
  });

  test("degrades rather than showing NaN", () => {
    expect(formatTotalTime(0)).toBe("0m");
    expect(formatTotalTime(NaN)).toBe("0m");
  });
});

describe("recapPace", () => {
  test("is the period average, not the average of each pace", () => {
    // 10km in 60 min overall = 6:00/km, even though the parts differ.
    const recap = buildRecap(
      [activity("fast", 0, 5000, 1500), activity("slow", 1, 5000, 2100)],
      "week",
      NOW
    );

    expect(recapPace(recap, "km")).toBe("6:00");
  });

  test("is an em dash with no distance", () => {
    expect(recapPace(buildRecap([activity("gym", 0, 0, 3600)], "week", NOW), "km")).toBe("—");
    expect(recapPace(buildRecap([], "week", NOW), "km")).toBe("—");
  });

  test("follows the unit", () => {
    const recap = buildRecap([activity("a", 0, 10000, 3600)], "week", NOW);
    expect(recapPace(recap, "mi")).not.toBe(recapPace(recap, "km"));
  });
});

describe("recapToStatData", () => {
  test("composes through the ordinary StatData shape", () => {
    const recap = buildRecap(
      [activity("a", 0, 8000, 2400), activity("b", 1, 12000, 3600)],
      "week",
      NOW
    );
    const stat = recapToStatData(recap, "km");

    expect(stat.title).toBe("Week in Review");
    expect(stat.distance).toBe(20);
    expect(stat.distanceUnit).toBe("km");
    expect(stat.time).toBe("1h 40m");
  });

  test("exposes count and longest as metrics", () => {
    const recap = buildRecap(
      [activity("a", 0, 8000, 2400), activity("b", 1, 12000, 3600)],
      "week",
      NOW
    );
    const stat = recapToStatData(recap, "km");

    expect(stat.metrics?.activity_count.value).toBe("2");
    expect(stat.metrics?.longest.value).toBe("12.0");
  });

  test("totals elevation across the period when activities report it", () => {
    const recap = buildRecap(
      [
        activity("a", 0, 8000, 2400, { elevGain: "142" }),
        activity("b", 1, 5000, 1800, { elevGain: "1,200" }),
      ],
      "week",
      NOW
    );

    expect(recapToStatData(recap, "km").metrics?.total_elev.value).toBe("1,342");
  });

  test("omits elevation when nothing recorded any", () => {
    const recap = buildRecap([activity("a", 0, 8000, 2400)], "week", NOW);
    expect(recapToStatData(recap, "km").metrics?.total_elev).toBeUndefined();
  });
});

describe("labels", () => {
  test("names the period", () => {
    expect(recapTitle(buildRecap([], "week", NOW))).toBe("Week in Review");
    expect(recapTitle(buildRecap([], "month", NOW))).toBe("Month in Review");
  });

  test("summarises count, distance and time", () => {
    const recap = buildRecap([activity("a", 0, 8000, 2400)], "week", NOW);
    expect(recapSummary(recap, "km")).toBe("1 activity · 8.0 km · 40m");
  });

  test("pluralises correctly", () => {
    const recap = buildRecap(
      [activity("a", 0, 8000, 2400), activity("b", 1, 2000, 600)],
      "week",
      NOW
    );
    expect(recapSummary(recap, "km")).toContain("2 activities");
  });

  test("says so when the period is empty", () => {
    expect(recapSummary(buildRecap([], "week", NOW), "km")).toBe("No activities yet");
  });
});
