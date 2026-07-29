/**
 * Tests for formatterRegistry — every formatter produces correct output
 * for a given sample StatData.
 */

import { describe, test, expect } from "vitest";
import { FORMATTER_REGISTRY, resolveFormatter, FORMATTER_OPTIONS } from "./formatterRegistry";
import type { StatData } from "../types";

const SAMPLE: StatData = {
  distance: 5.24,
  distanceUnit: "km",
  pace: "5:12",
  time: "26:04",
  title: "Morning Run",
};

describe("formatterRegistry", () => {
  test("all formatters in FORMATTER_OPTIONS have a valid entry", () => {
    for (const opt of FORMATTER_OPTIONS) {
      expect(FORMATTER_REGISTRY[opt.value]).toBeDefined();
    }
  });

  test("dist1 formats distance to 1 decimal", () => {
    expect(FORMATTER_REGISTRY.dist1(SAMPLE)).toBe("5.2");
  });

  test("dist2 formats distance to 2 decimals", () => {
    expect(FORMATTER_REGISTRY.dist2(SAMPLE)).toBe("5.24");
  });

  test("distPadded pads distance with leading zeros", () => {
    expect(FORMATTER_REGISTRY.distPadded(SAMPLE)).toBe("05.24");
  });

  test("unit returns the distance unit", () => {
    expect(FORMATTER_REGISTRY.unit(SAMPLE)).toBe("km");
  });

  test("unitUpper uppercases the distance unit", () => {
    expect(FORMATTER_REGISTRY.unitUpper(SAMPLE)).toBe("KM");
  });

  test("pace returns formatted pace string", () => {
    expect(FORMATTER_REGISTRY.pace(SAMPLE)).toBe("5:12");
  });

  test("time returns formatted time string", () => {
    expect(FORMATTER_REGISTRY.time(SAMPLE)).toBe("26:04");
  });

  test("title returns activity title", () => {
    expect(FORMATTER_REGISTRY.title(SAMPLE)).toBe("Morning Run");
  });

  test("resolveFormatter returns correct function for valid name", () => {
    const fn = resolveFormatter("dist1");
    expect(fn(SAMPLE)).toBe("5.2");
  });

  test("resolveFormatter returns noop for unknown name", () => {
    const fn = resolveFormatter("nonexistent");
    expect(fn(SAMPLE)).toBe("");
  });

  test("dateShort returns a non-empty uppercase string", () => {
    const result = FORMATTER_REGISTRY.dateShort(SAMPLE);
    expect(result).toBeTruthy();
    expect(result).toEqual(result.toUpperCase());
  });

  test("weekday returns a non-empty string", () => {
    const result = FORMATTER_REGISTRY.weekday(SAMPLE);
    expect(result).toBeTruthy();
  });
});
