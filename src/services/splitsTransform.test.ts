import { describe, expect, test } from "vitest";
import { toSplitSamples } from "./splitsTransform";
import type { StravaActivity, StravaSplit } from "../types";

function activity(splits?: StravaSplit[]): StravaActivity {
  return {
    id: 1,
    name: "Morning Run",
    distance: 8420,
    moving_time: 3138,
    elapsed_time: 3304,
    type: "Run",
    sport_type: "Run",
    start_date: "2026-08-02T06:00:00Z",
    start_date_local: "2026-08-02T08:00:00Z",
    average_speed: 2.68,
    max_speed: 3.9,
    has_heartrate: true,
    kudos_count: 0,
    achievement_count: 0,
    splits_metric: splits,
  };
}

describe("toSplitSamples", () => {
  test("returns undefined when the activity has no splits", () => {
    expect(toSplitSamples(activity())).toBeUndefined();
    expect(toSplitSamples(activity([]))).toBeUndefined();
  });

  test("maps a full split to seconds per kilometre", () => {
    const [first] = toSplitSamples(
      activity([{ distance: 1000, elapsed_time: 372, moving_time: 372, split: 1 }])
    )!;

    expect(first.index).toBe(1);
    expect(first.distanceMeters).toBe(1000);
    expect(first.elapsed).toBe(372);
    expect(first.paceSecondsPerKm).toBeCloseTo(372, 5);
  });

  test("normalises a partial final split to a full-kilometre pace", () => {
    // 400m in 150s is a 6:15/km pace, not a 2:30 one. Taking the raw duration
    // would render the last bar as a wild outlier.
    const samples = toSplitSamples(
      activity([
        { distance: 1000, elapsed_time: 372, moving_time: 372, split: 1 },
        { distance: 400, elapsed_time: 150, moving_time: 150, split: 2 },
      ])
    )!;

    expect(samples[1].paceSecondsPerKm).toBeCloseTo(375, 5);
  });

  test("drops a zero-distance split rather than dividing by zero", () => {
    const samples = toSplitSamples(
      activity([
        { distance: 1000, elapsed_time: 372, moving_time: 372, split: 1 },
        { distance: 0, elapsed_time: 4, moving_time: 0, split: 2 },
      ])
    )!;

    expect(samples).toHaveLength(1);
    expect(samples.every((s) => Number.isFinite(s.paceSecondsPerKm))).toBe(true);
  });

  test("drops a zero-duration split", () => {
    const samples = toSplitSamples(
      activity([
        { distance: 1000, elapsed_time: 372, moving_time: 372, split: 1 },
        { distance: 1000, elapsed_time: 0, moving_time: 0, split: 2 },
      ])
    )!;

    expect(samples).toHaveLength(1);
  });

  test("prefers moving time, falling back to elapsed", () => {
    const [only] = toSplitSamples(
      activity([{ distance: 1000, elapsed_time: 400, moving_time: 0, split: 1 }])
    )!;

    expect(only.paceSecondsPerKm).toBeCloseTo(400, 5);
  });

  test("returns undefined when every split is unusable", () => {
    expect(
      toSplitSamples(activity([{ distance: 0, elapsed_time: 0, moving_time: 0, split: 1 }]))
    ).toBeUndefined();
  });
});
