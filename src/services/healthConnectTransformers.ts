/**
 * Health Connect data transformers.
 *
 * Converts Health Connect data shapes into the app's existing type shapes
 * (StatData, MetricOption, etc.) so components that already work with
 * Strava and mock data also work with Health Connect data.
 */

import type { DistanceUnit } from "../utils/units";
import { distanceValue, formatPace as formatPaceInUnit } from "../utils/units";
import { getDistanceUnit } from "../utils/unitPreference";
import type { DailyHealthData, MetricOption, StatData } from "../types";

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

/**
 * Convert daily health data into the core StatData shape used by templates,
 * the camera overlay, and the export system.
 *
 * Maps:
 *   distance    → distance / distanceUnit
 *   pace        → derived from steps (rough: minutes per km walked)
 *   time        → derived from step count at ~100 steps/min walking pace
 *   title       → "Today's Activity"
 */
export function dailyHealthToStatData(
  health: DailyHealthData,
  unit: DistanceUnit = getDistanceUnit()
): StatData {
  // Rough pace estimate: assume ~100 steps/min casual walking pace,
  // ~0.7m average step length
  const walkingMinutes = health.steps > 0
    ? Math.round(health.steps / 100)
    : 0;
  const meters = health.distanceKm * 1000;
  const seconds = walkingMinutes * 60;

  return {
    distance: distanceValue(meters, unit),
    distanceUnit: unit,
    pace: formatPaceInUnit(meters, seconds, unit),
    time: formatWalkingTime(walkingMinutes),
    title: "Today's Activity",
  };
}

/**
 * Convert daily health data into an activity-card shape compatible with
 * the HomeScreen activity list.
 */
export function dailyHealthToActivityData(
  health: DailyHealthData,
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
  const walkingMinutes = health.steps > 0
    ? Math.round(health.steps / 100)
    : 0;
  const paceMinutes = health.distanceKm > 0
    ? Math.round(walkingMinutes / health.distanceKm)
    : 0;
  const paceSeconds = health.distanceKm > 0
    ? Math.round((walkingMinutes / health.distanceKm - paceMinutes) * 60)
    : 0;

  return {
    id: "health_today",
    title: "Daily Activity",
    subtitle: `${health.steps.toLocaleString()} steps`,
    distance: health.distanceKm > 0 ? health.distanceKm.toFixed(1) : "--",
    time: formatWalkingTime(walkingMinutes),
    pace: health.distanceKm > 0
      ? `${paceMinutes}:${paceSeconds.toString().padStart(2, "0")}`
      : "--:--",
    timeAgo: "Today",
    type: "Walk",
    iconType: "activity" as const,
  };
}

// ---------------------------------------------------------------------------
// Health metrics for the editor overlay system
// ---------------------------------------------------------------------------

/**
 * Generate MetricOption entries for Health Connect data.
 * These can be merged into the existing `ALL_METRICS` array to make health
 * data selectable in the editor's overlay system.
 */
export function healthMetricsFromDaily(health: DailyHealthData): MetricOption[] {
  return [
    {
      id: "hc_steps",
      label: "Steps",
      value: health.steps.toLocaleString(),
      unit: "steps",
      category: "Performance",
      icon: "👣",
    },
    {
      id: "hc_calories",
      label: "Calories",
      value: Math.round(health.caloriesBurned).toLocaleString(),
      unit: "kcal",
      category: "Performance",
      icon: "🔥",
    },
    {
      id: "hc_avg_hr",
      label: "Avg Heart Rate",
      value: health.heartRate.avg > 0 ? String(health.heartRate.avg) : "--",
      unit: "BPM",
      category: "Performance",
      icon: "❤️",
    },
    {
      id: "hc_resting_hr",
      label: "Resting HR",
      value: health.heartRate.resting > 0 ? String(health.heartRate.resting) : "--",
      unit: "BPM",
      category: "Performance",
      icon: "💓",
    },
    {
      id: "hc_sleep",
      label: "Sleep",
      value: health.sleepHours > 0 ? `${health.sleepHours}` : "--",
      unit: "hours",
      category: "Performance",
      icon: "😴",
    },
    {
      id: "hc_weight",
      label: "Weight",
      value: health.weightKg > 0 ? `${health.weightKg}` : "--",
      unit: "kg",
      category: "Performance",
      icon: "⚖️",
    },
  ];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatWalkingTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0:00";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:00`;
  }
  return `${m}:00`;
}
