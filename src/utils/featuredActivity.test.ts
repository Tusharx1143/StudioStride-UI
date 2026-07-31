import { describe, expect, test } from "vitest";
import { partitionActivities } from "./featuredActivity";
import type { UnifiedActivity } from "../sources/types";

function activity(id: string): UnifiedActivity {
  return {
    id,
    sourceId: "strava",
    title: id,
    subtitle: "Run",
    type: "Run",
    iconType: "activity",
    displayDistance: "5.0",
    displayDistanceUnit: "km",
    displayTime: "30:00",
    displayPace: "6:00 /km",
    displayTimeAgo: "today",
    date: "2026-07-30T08:00:00Z",
    distanceMeters: 5000,
    movingTime: 1800,
    toStatData: () => ({
      distance: 5,
      distanceUnit: "km",
      pace: "6:00",
      time: "30:00",
      title: id,
    }),
  };
}

const LIST = [activity("a"), activity("b"), activity("c")];

describe("partitionActivities", () => {
  test("features the newest activity when nothing has been chosen", () => {
    const { featured, previous } = partitionActivities(LIST, null);

    expect(featured?.id).toBe("a");
    expect(previous.map((p) => p.id)).toEqual(["b", "c"]);
  });

  test("features the chosen activity and demotes the rest", () => {
    const { featured, previous } = partitionActivities(LIST, "b");

    expect(featured?.id).toBe("b");
    expect(previous.map((p) => p.id)).toEqual(["a", "c"]);
  });

  test("keeps the demoted activity in its original order", () => {
    // The previous list stays chronological rather than moving the demoted
    // card to the top, so positions don't shuffle unexpectedly.
    const { previous } = partitionActivities(LIST, "c");

    expect(previous.map((p) => p.id)).toEqual(["a", "b"]);
  });

  test("falls back to the newest when the chosen activity is filtered out", () => {
    // Switching source or type filters can remove whatever was featured.
    const { featured, previous } = partitionActivities(LIST, "zzz");

    expect(featured?.id).toBe("a");
    expect(previous.map((p) => p.id)).toEqual(["b", "c"]);
  });

  test("handles an empty list", () => {
    const { featured, previous } = partitionActivities([], "a");

    expect(featured).toBeNull();
    expect(previous).toEqual([]);
  });

  test("leaves nothing in previous when there is a single activity", () => {
    const { featured, previous } = partitionActivities([activity("solo")], null);

    expect(featured?.id).toBe("solo");
    expect(previous).toEqual([]);
  });
});
