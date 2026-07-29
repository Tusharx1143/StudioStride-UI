/**
 * Data transformers — convert Strava API response shapes into the app's
 * existing type shapes (StatData, MetricOption, ActivityData, etc.)
 * so that components that already work with mock data also work with
 * real data without structural changes.
 */

import type { StatData, StravaActivity, StravaTotals } from "../types";

// ---------------------------------------------------------------------------
// Unit converters
// ---------------------------------------------------------------------------

/**
 * Convert meters/second to a pace string in MM:SS per kilometre.
 * Returns "--:--" for stationary activities (speed ≈ 0).
 */
export function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return "--:--";
  const secondsPerKm = Math.round(1000 / metersPerSecond);
  const min = Math.floor(secondsPerKm / 60);
  const sec = secondsPerKm % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Format seconds as HH:MM:SS or MM:SS (omitting hours if < 1 h).
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format a Strava distance (meters) to km with one decimal place.
 */
export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1);
}

/**
 * Map Strava sport/activity type to an iconType string used in HomeScreen.
 */
export function getIconType(
  type: string,
  _sportType?: string
): "activity" | "target" | "flame" | "mountain" {
  const t = type.toLowerCase();
  if (t.includes("ride") || t.includes("bike") || t.includes("cycling")) return "target";
  if (t.includes("hike") || t.includes("climb") || t.includes("trail")) return "mountain";
  if (t.includes("workout") || t.includes("gym") || t.includes("strength")) return "flame";
  return "activity";
}

/**
 * Compute a human-readable "time ago" string from a Strava ISO date.
 */
export function getTimeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "Just now";

  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;

  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  if (diffD < 7) return `${diffD} days ago`;

  const diffW = Math.floor(diffD / 7);
  if (diffW < 5) return `${diffW}w ago`;

  // Beyond ~1 month, just show the date
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Derive a short subtitle (location hint) from a Strava activity.
 * Falls back to the sport type if no location is known.
 */
export function getActivitySubtitle(activity: StravaActivity): string {
  // Strava summary activities don't include location names,
  // so we fall back to a readable sport type label.
  const label = activity.sport_type || activity.type;
  return label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ---------------------------------------------------------------------------
// Transformers — full objects
// ---------------------------------------------------------------------------

/**
 * Convert a StravaActivity into the app's core StatData shape (used by
 * templates, the camera overlay, and the export system).
 */
export function activityToStatData(activity: StravaActivity): StatData {
  return {
    distance: activity.distance / 1000, // meters → km
    distanceUnit: "km",
    pace: formatPace(activity.average_speed),
    time: formatDuration(activity.moving_time || activity.elapsed_time),
    title: activity.name,
  };
}

/**
 * Convert a StravaActivity into the HomeScreen's ActivityData shape.
 */
export function activityToActivityData(
  activity: StravaActivity
): {
  id: string;
  title: string;
  subtitle: string;
  distance: string;
  time: string;
  pace: string;
  timeAgo: string;
  type: string;
  iconType: "activity" | "target" | "flame" | "mountain";
} {
  return {
    id: `strava_${activity.id}`,
    title: activity.name,
    subtitle: getActivitySubtitle(activity),
    distance: formatDistance(activity.distance),
    time: formatDuration(activity.moving_time || activity.elapsed_time),
    pace: formatPace(activity.average_speed),
    timeAgo: getTimeAgo(activity.start_date_local),
    type: activity.type,
    iconType: getIconType(activity.type, activity.sport_type),
  };
}

/**
 * Aggregate StravaTotals across run/ride/swim for an overall number.
 */
export interface AggregatedTotals {
  count: number;
  distanceKm: number;
  movingTimeFormatted: string;
  elevationGainM: number;
}

/**
 * Aggregate multiple StravaTotals objects (e.g. all_run + all_ride + all_swim).
 */
export function aggregateTotals(...totals: StravaTotals[]): AggregatedTotals {
  const sum = totals.reduce(
    (acc, t) => ({
      count: acc.count + t.count,
      distance: acc.distance + t.distance,
      movingTime: acc.movingTime + t.moving_time,
      elevationGain: acc.elevationGain + t.elevation_gain,
    }),
    { count: 0, distance: 0, movingTime: 0, elevationGain: 0 }
  );

  return {
    count: sum.count,
    distanceKm: Math.round((sum.distance / 1000) * 100) / 100,
    movingTimeFormatted: formatDuration(sum.movingTime),
    elevationGainM: Math.round(sum.elevationGain),
  };
}
