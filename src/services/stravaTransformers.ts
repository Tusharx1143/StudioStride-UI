/**
 * Data transformers — convert Strava API response shapes into the app's
 * existing type shapes (StatData, MetricOption, ActivityData, etc.)
 * so that components that already work with mock data also work with
 * real data without structural changes.
 */

import type { MetricValue, StatData, StravaActivity, StravaTotals } from "../types";
import type { DistanceUnit } from "../utils/units";
import {
  distanceValue,
  elevationSuffix,
  formatDistance as formatDistanceInUnit,
  formatElevation,
  formatPace as formatPaceInUnit,
  metersPerUnit,
} from "../utils/units";

// ---------------------------------------------------------------------------
// Unit converters
// ---------------------------------------------------------------------------

/**
 * Convert meters/second to a pace string in MM:SS per unit of distance.
 * Returns "--:--" for stationary activities (speed ≈ 0).
 */
export function formatPace(metersPerSecond: number, unit: DistanceUnit = "km"): string {
  if (metersPerSecond <= 0) return "--:--";
  const secondsPerUnit = Math.round(metersPerUnit(unit) / metersPerSecond);
  const min = Math.floor(secondsPerUnit / 60);
  const sec = secondsPerUnit % 60;
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
 * Format a Strava distance (meters) in the given unit, one decimal place.
 */
export function formatDistance(meters: number, unit: DistanceUnit = "km"): string {
  return formatDistanceInUnit(meters, unit);
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
/**
 * The metrics a Strava activity carries beyond the core four.
 *
 * Every field read here was already in the `/athlete/activities` payload and
 * was being thrown away: `StatSlotId` had five values while the response had
 * elevation, calories, heart rate, watts, suffer score, max speed, kudos, and
 * achievement count.
 *
 * A metric is emitted only when the activity actually has it, so the picker
 * never offers a stat that would render blank — a treadmill run has no
 * elevation, and only cyclists with a power meter have watts.
 */
export function activityToMetrics(
  activity: StravaActivity,
  unit: DistanceUnit = "km"
): Record<string, MetricValue> {
  const metrics: Record<string, MetricValue> = {};

  const add = (m: MetricValue) => {
    metrics[m.id] = m;
  };

  const speedUnit = unit === "mi" ? "mph" : "km/h";
  const toSpeed = (metersPerSecond: number) =>
    (metersPerSecond * (unit === "mi" ? 2.23694 : 3.6)).toFixed(1);

  if (activity.total_elevation_gain) {
    add({
      id: "elev_gain",
      label: "Elevation Gain",
      value: formatElevation(activity.total_elevation_gain, unit),
      unit: elevationSuffix(unit),
      category: "Elevation",
      icon: "⛰️",
    });
  }

  if (activity.elev_high != null) {
    add({
      id: "max_elev",
      label: "Max Elevation",
      value: formatElevation(activity.elev_high, unit),
      unit: elevationSuffix(unit),
      category: "Elevation",
      icon: "🏔️",
    });
  }

  if (activity.calories) {
    add({
      id: "calories",
      label: "Calories",
      value: Math.round(activity.calories).toLocaleString(),
      unit: "kcal",
      category: "Performance",
      icon: "🔥",
    });
  }

  if (activity.has_heartrate && activity.average_heartrate) {
    add({
      id: "avg_hr",
      label: "Avg Heart Rate",
      value: Math.round(activity.average_heartrate).toString(),
      unit: "BPM",
      category: "Performance",
      icon: "❤️",
    });
  }

  if (activity.has_heartrate && activity.max_heartrate) {
    add({
      id: "max_hr",
      label: "Max Heart Rate",
      value: Math.round(activity.max_heartrate).toString(),
      unit: "BPM",
      category: "Performance",
      icon: "💥",
    });
  }

  if (activity.average_watts) {
    add({
      id: "power",
      label: "Avg Power",
      value: Math.round(activity.average_watts).toString(),
      unit: "W",
      category: "Ride",
      icon: "⚡",
    });
  }

  if (activity.average_speed) {
    add({
      id: "speed",
      label: "Avg Speed",
      value: toSpeed(activity.average_speed),
      unit: speedUnit,
      category: "Ride",
      icon: "🚴",
    });
  }

  if (activity.max_speed) {
    add({
      id: "max_speed",
      label: "Max Speed",
      value: toSpeed(activity.max_speed),
      unit: speedUnit,
      category: "Ride",
      icon: "🚀",
    });
  }

  if (activity.suffer_score) {
    add({
      id: "suffer_score",
      label: "Relative Effort",
      value: Math.round(activity.suffer_score).toString(),
      unit: "",
      category: "Performance",
      icon: "😤",
    });
  }

  if (activity.kudos_count) {
    add({
      id: "kudos",
      label: "Kudos",
      value: activity.kudos_count.toLocaleString(),
      unit: "👍",
      category: "Achievements",
      icon: "👏",
    });
  }

  if (activity.achievement_count) {
    add({
      id: "achievements",
      label: "Achievements",
      value: activity.achievement_count.toLocaleString(),
      unit: "🏅",
      category: "Achievements",
      icon: "🏆",
    });
  }

  add({
    id: "elapsed_time",
    label: "Elapsed Time",
    value: formatDuration(activity.elapsed_time || activity.moving_time),
    unit: "",
    category: "Running",
    icon: "🕒",
  });

  return metrics;
}

export function activityToStatData(
  activity: StravaActivity,
  unit: DistanceUnit = "km"
): StatData {
  return {
    metrics: activityToMetrics(activity, unit),
    distance: distanceValue(activity.distance, unit),
    distanceUnit: unit,
    // Derived from distance and time rather than average_speed, so a pace of
    // "--:--" and a distance of 0 can never disagree.
    pace: formatPaceInUnit(
      activity.distance,
      activity.moving_time || activity.elapsed_time,
      unit
    ),
    time: formatDuration(activity.moving_time || activity.elapsed_time),
    title: activity.name,
  };
}

/**
 * Convert a StravaActivity into the HomeScreen's ActivityData shape.
 */
export function activityToActivityData(
  activity: StravaActivity,
  unit: DistanceUnit = "km"
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
    distance: formatDistance(activity.distance, unit),
    time: formatDuration(activity.moving_time || activity.elapsed_time),
    pace: formatPaceInUnit(
      activity.distance,
      activity.moving_time || activity.elapsed_time,
      unit
    ),
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
