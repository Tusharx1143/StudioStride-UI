import { describe, expect, test } from "vitest";
import { decodePolyline } from "./decodePolyline";

/**
 * The canonical fixture from Google's encoded-polyline specification.
 * Decodes to three points in California/Oregon.
 */
const GOOGLE_FIXTURE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

describe("decodePolyline", () => {
  test("decodes the canonical Google fixture to its documented points", () => {
    const points = decodePolyline(GOOGLE_FIXTURE);

    expect(points).not.toBeNull();
    expect(points!.length).toBe(3);

    expect(points![0][0]).toBeCloseTo(38.5, 5);
    expect(points![0][1]).toBeCloseTo(-120.2, 5);
    expect(points![1][0]).toBeCloseTo(40.7, 5);
    expect(points![1][1]).toBeCloseTo(-120.95, 5);
    expect(points![2][0]).toBeCloseTo(43.252, 5);
    expect(points![2][1]).toBeCloseTo(-126.453, 5);
  });

  test("returns null for an empty string", () => {
    // Strava sends "" when the athlete has hidden the activity's map.
    expect(decodePolyline("")).toBeNull();
  });

  test("returns null for characters outside the encodable range", () => {
    // '!' is charCode 33, below the 63 offset every encoded char carries.
    expect(decodePolyline("!!!")).toBeNull();
  });

  test("returns null when the final chunk is truncated mid-value", () => {
    // Trailing '_' (charCode 95 → 32) has the continuation bit set, so the
    // value never terminates.
    expect(decodePolyline("_p~iF~ps|U_")).toBeNull();
  });

  test("returns null when a latitude has no matching longitude", () => {
    // "_p~iF" is one complete value — a lat with nothing to pair it with.
    expect(decodePolyline("_p~iF")).toBeNull();
  });
});
