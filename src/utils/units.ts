/**
 * Distance and pace formatting for both measurement systems.
 *
 * The app was hardcoded metric everywhere — `distanceUnit: "km"` in the
 * editor, `" /km"` stripped from pace strings, km totals in Profile — while
 * `StravaAthlete.measurement_preference` was typed and never read. Every US,
 * UK, and Canadian athlete saw the wrong units on their own workout.
 *
 * `UnifiedActivity` already stores raw `distanceMeters` and `movingTime`, so
 * conversion has one home and no consumer does its own arithmetic.
 */

export type DistanceUnit = "km" | "mi";

const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;

export function metersPerUnit(unit: DistanceUnit): number {
  return unit === "mi" ? METERS_PER_MILE : METERS_PER_KM;
}

/** "8.4" — the number only; the unit is rendered separately. */
export function formatDistance(meters: number, unit: DistanceUnit): string {
  if (!Number.isFinite(meters) || meters <= 0) return "0.0";
  return (meters / metersPerUnit(unit)).toFixed(1);
}

export function distanceValue(meters: number, unit: DistanceUnit): number {
  if (!Number.isFinite(meters) || meters <= 0) return 0;
  return Number((meters / metersPerUnit(unit)).toFixed(1));
}

/**
 * "6:12" — minutes and seconds per unit of distance.
 *
 * Returns an em dash rather than "Infinity:NaN" for activities with no
 * distance, which is every gym session and most Health Connect workouts.
 */
export function formatPace(meters: number, seconds: number, unit: DistanceUnit): string {
  if (!Number.isFinite(meters) || !Number.isFinite(seconds)) return "—";
  if (meters <= 0 || seconds <= 0) return "—";

  const secondsPerUnit = seconds / (meters / metersPerUnit(unit));
  if (!Number.isFinite(secondsPerUnit)) return "—";

  const totalSeconds = Math.round(secondsPerUnit);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

/** "/km" or "/mi" — the suffix shown after a pace. */
export function paceSuffix(unit: DistanceUnit): string {
  return `/${unit}`;
}

/**
 * Strava reports `"feet"` or `"meters"`. Anything unrecognised — including the
 * field being absent, which it often is — falls back to metric.
 */
export function unitFromMeasurementPreference(preference?: string): DistanceUnit {
  return preference?.toLowerCase() === "feet" ? "mi" : "km";
}

/** Elevation and other short distances, which follow the same system. */
export function formatElevation(meters: number, unit: DistanceUnit): string {
  if (!Number.isFinite(meters)) return "0";
  const value = unit === "mi" ? meters * 3.28084 : meters;
  return Math.round(value).toLocaleString();
}

export function elevationSuffix(unit: DistanceUnit): string {
  return unit === "mi" ? "ft" : "m";
}
