import { describe, expect, test } from "vitest";
import { toUnifiedActivity } from "./StravaSourceAdapter";
import type { StravaActivity } from "../../types";

/** Canonical Google encoded-polyline fixture — three points, real extent. */
const POLYLINE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

function activity(patch: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 12345,
    name: "Morning Run",
    distance: 8400,
    moving_time: 3138,
    elapsed_time: 3200,
    type: "Run",
    sport_type: "Run",
    start_date: "2026-07-29T06:00:00Z",
    start_date_local: "2026-07-29T08:00:00Z",
    average_speed: 2.677,
    max_speed: 3.5,
    has_heartrate: true,
    kudos_count: 4,
    achievement_count: 1,
    ...patch,
  };
}

describe("toUnifiedActivity route geometry", () => {
  test("attaches geometry when the activity has a summary polyline", () => {
    const unified = toUnifiedActivity(activity({ map: { summary_polyline: POLYLINE } }));

    expect(unified.route).toBeDefined();
    expect(unified.route!.points.length).toBe(3);
    expect(Number.isFinite(unified.route!.aspect)).toBe(true);
  });

  test("leaves route undefined when the activity has no map", () => {
    expect(toUnifiedActivity(activity()).route).toBeUndefined();
  });

  test("leaves route undefined when the map has been hidden", () => {
    // Strava sends an empty polyline for activities with the map hidden.
    const unified = toUnifiedActivity(activity({ map: { summary_polyline: "" } }));

    expect(unified.route).toBeUndefined();
  });

  test("leaves route undefined when the polyline is malformed", () => {
    // One bad string must not take out the activity that carries it.
    const unified = toUnifiedActivity(activity({ map: { summary_polyline: "!!!" } }));

    expect(unified.route).toBeUndefined();
  });

  test("still maps the activity's other fields when there is no route", () => {
    const unified = toUnifiedActivity(activity());

    expect(unified.id).toBe("strava_12345");
    expect(unified.title).toBe("Morning Run");
    expect(unified.distanceMeters).toBe(8400);
  });
});
