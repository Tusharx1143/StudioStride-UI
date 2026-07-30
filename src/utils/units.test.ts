import { describe, expect, test } from "vitest";
import {
  distanceValue,
  elevationSuffix,
  formatDistance,
  formatElevation,
  formatPace,
  paceSuffix,
  unitFromMeasurementPreference,
} from "./units";

describe("formatDistance", () => {
  test("converts metres to the chosen unit", () => {
    expect(formatDistance(8400, "km")).toBe("8.4");
    expect(formatDistance(8400, "mi")).toBe("5.2");
  });

  test("a marathon reads correctly in both systems", () => {
    expect(formatDistance(42195, "km")).toBe("42.2");
    expect(formatDistance(42195, "mi")).toBe("26.2");
  });

  test("degrades to zero rather than NaN", () => {
    expect(formatDistance(0, "km")).toBe("0.0");
    expect(formatDistance(-5, "km")).toBe("0.0");
    expect(formatDistance(NaN, "km")).toBe("0.0");
  });
});

describe("distanceValue", () => {
  test("returns a number matching the formatted string", () => {
    expect(distanceValue(8400, "km")).toBe(8.4);
    expect(distanceValue(8400, "mi")).toBe(5.2);
  });

  test("is zero for activities with no distance", () => {
    expect(distanceValue(0, "mi")).toBe(0);
  });
});

describe("formatPace", () => {
  test("computes minutes per unit", () => {
    // 8400 m in 52:18 (3138 s) ≈ 6:14 /km
    expect(formatPace(8400, 3138, "km")).toBe("6:14");
    // ...which is a slower number per mile
    expect(formatPace(8400, 3138, "mi")).toBe("10:01");
  });

  test("pads seconds to two digits", () => {
    expect(formatPace(1000, 305, "km")).toBe("5:05");
  });

  test("returns an em dash where pace is meaningless", () => {
    expect(formatPace(0, 1800, "km")).toBe("—");
    expect(formatPace(5000, 0, "km")).toBe("—");
    expect(formatPace(NaN, 100, "km")).toBe("—");
    expect(formatPace(5000, NaN, "km")).toBe("—");
  });

  test("a mile pace is always the larger number for the same effort", () => {
    const km = formatPace(10000, 3000, "km");
    const mi = formatPace(10000, 3000, "mi");
    const toSeconds = (p: string) => {
      const [m, s] = p.split(":").map(Number);
      return m * 60 + s;
    };
    expect(toSeconds(mi)).toBeGreaterThan(toSeconds(km));
  });
});

describe("unitFromMeasurementPreference", () => {
  test("maps Strava's vocabulary", () => {
    expect(unitFromMeasurementPreference("feet")).toBe("mi");
    expect(unitFromMeasurementPreference("meters")).toBe("km");
  });

  test("is case-insensitive", () => {
    expect(unitFromMeasurementPreference("FEET")).toBe("mi");
  });

  test("falls back to metric when the field is missing or unknown", () => {
    expect(unitFromMeasurementPreference(undefined)).toBe("km");
    expect(unitFromMeasurementPreference("")).toBe("km");
    expect(unitFromMeasurementPreference("furlongs")).toBe("km");
  });
});

describe("suffixes", () => {
  test("pace suffix follows the unit", () => {
    expect(paceSuffix("km")).toBe("/km");
    expect(paceSuffix("mi")).toBe("/mi");
  });

  test("elevation switches to feet for imperial", () => {
    expect(elevationSuffix("km")).toBe("m");
    expect(elevationSuffix("mi")).toBe("ft");
    expect(formatElevation(100, "km")).toBe("100");
    expect(formatElevation(100, "mi")).toBe("328");
  });
});
