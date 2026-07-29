/**
 * Google Health Connect service.
 *
 * Wraps @capgo/capacitor-health to provide a clean API for reading health
 * data from the user's device. Falls back gracefully on web / non-Android.
 *
 * All data is read **from the device only** — nothing is sent to a server.
 */

import type {
  HealthConnectState,
  DailyHealthData,
  WeeklyHealthData,
} from "../types";

// ---------------------------------------------------------------------------
// Lazy plugin import (throws at runtime on web)
// ---------------------------------------------------------------------------

let Health: typeof import("@capgo/capacitor-health").Health | null = null;

async function ensurePlugin(): Promise<typeof import("@capgo/capacitor-health").Health> {
  if (Health) return Health;
  try {
    const mod = await import("@capgo/capacitor-health");
    Health = mod.Health;
    return Health;
  } catch {
    throw new HealthConnectUnavailableError(
      "@capgo/capacitor-health is not available in this environment"
    );
  }
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class HealthConnectUnavailableError extends Error {
  constructor(message?: string) {
    super(message ?? "Google Health Connect is not available on this device");
    this.name = "HealthConnectUnavailableError";
  }
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/**
 * Check whether Health Connect is available on this device.
 * On web this returns `{ available: false }` without throwing.
 */
export async function isAvailable(): Promise<HealthConnectState> {
  try {
    const plugin = await ensurePlugin();
    const result = await plugin.isAvailable();
    return {
      available: result.available,
      authorized: false,
      loading: false,
      error: result.available ? null : result.reason ?? null,
    };
  } catch {
    return {
      available: false,
      authorized: false,
      loading: false,
      error: "Health Connect is not available in this environment",
    };
  }
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Data types we need to read for the app's features.
 * Mirrors `HEALTH_PERMISSION_TYPES` from types.ts.
 */
const READ_SCOPES: import("@capgo/capacitor-health").HealthDataType[] = [
  "steps",
  "distance",
  "calories",
  "heartRate",
  "sleep",
  "weight",
];

/**
 * Request read permissions for the health data types the app needs.
 * Shows the system permission dialog on Android.
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    const plugin = await ensurePlugin();
    const result = await plugin.requestAuthorization({
      read: READ_SCOPES,
      write: [],
    });
    // Check that at least our core data types were granted
    const granted = result.readAuthorized ?? [];
    return (
      granted.includes("steps") &&
      granted.includes("distance") &&
      granted.includes("calories")
    );
  } catch {
    return false;
  }
}

/**
 * Check which Health Connect permissions are currently granted.
 */
export async function checkPermissions(): Promise<boolean> {
  try {
    const plugin = await ensurePlugin();
    const result = await plugin.checkAuthorization({
      read: READ_SCOPES,
      write: [],
    });
    const granted = result.readAuthorized ?? [];
    return granted.includes("steps");
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Data queries
// ---------------------------------------------------------------------------

/** Return ISO strings for today midnight → now. */
function todayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}

/** Return ISO strings for the past 7 days. */
function weekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}

/**
 * Query aggregated steps for today.
 */
export async function queryTodaySteps(): Promise<number> {
  try {
    const plugin = await ensurePlugin();
    const { startDate, endDate } = todayRange();
    const result = await plugin.queryAggregated({
      dataType: "steps",
      startDate,
      endDate,
      bucket: "day",
      aggregation: "sum",
    });
    return result.samples?.[0]?.value ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Query aggregated distance (meters) for today.
 */
export async function queryTodayDistance(): Promise<number> {
  try {
    const plugin = await ensurePlugin();
    const { startDate, endDate } = todayRange();
    const result = await plugin.queryAggregated({
      dataType: "distance",
      startDate,
      endDate,
      bucket: "day",
      aggregation: "sum",
    });
    const meters = result.samples?.[0]?.value ?? 0;
    return meters;
  } catch {
    return 0;
  }
}

/**
 * Query aggregated calories burned for today.
 */
export async function queryTodayCalories(): Promise<number> {
  try {
    const plugin = await ensurePlugin();
    const { startDate, endDate } = todayRange();
    const result = await plugin.queryAggregated({
      dataType: "calories",
      startDate,
      endDate,
      bucket: "day",
      aggregation: "sum",
    });
    return result.samples?.[0]?.value ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Query heart rate samples for today, returning avg / max.
 * Uses `readSamples` (aggregation not supported for heartRate).
 */
export async function queryTodayHeartRate(): Promise<{ avg: number; max: number }> {
  try {
    const plugin = await ensurePlugin();
    const { startDate, endDate } = todayRange();
    const result = await plugin.readSamples({
      dataType: "heartRate",
      startDate,
      endDate,
      limit: 500,
    });
    const values = result.samples.map((s) => s.value).filter((v) => v > 0);
    if (values.length === 0) return { avg: 0, max: 0 };
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      max: Math.round(Math.max(...values)),
    };
  } catch {
    return { avg: 0, max: 0 };
  }
}

/**
 * Query resting heart rate (single daily value if available).
 */
export async function queryRestingHeartRate(): Promise<number> {
  try {
    const plugin = await ensurePlugin();
    const { startDate, endDate } = todayRange();
    const result = await plugin.readSamples({
      dataType: "restingHeartRate",
      startDate,
      endDate,
      limit: 1,
    });
    return result.samples?.[0]?.value ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Query sleep duration for last night (minutes).
 * Uses `readSamples` (aggregation not supported for sleep).
 */
export async function queryTodaySleepMinutes(): Promise<number> {
  try {
    const plugin = await ensurePlugin();
    // Look at the past 24 h for sleep data
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const result = await plugin.readSamples({
      dataType: "sleep",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 50,
    });
    const asleepMinutes = result.samples
      .filter((s) => s.value > 0)
      .reduce((acc, s) => acc + s.value, 0);
    return Math.round(asleepMinutes);
  } catch {
    return 0;
  }
}

/**
 * Query latest weight reading.
 */
export async function queryLatestWeightKg(): Promise<number> {
  try {
    const plugin = await ensurePlugin();
    const { startDate, endDate } = todayRange();
    const result = await plugin.readSamples({
      dataType: "weight",
      startDate,
      endDate,
      limit: 1,
    });
    return result.samples?.[0]?.value ?? 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Combined queries
// ---------------------------------------------------------------------------

/**
 * Fetch today's complete health snapshot from Health Connect.
 * Returns a `DailyHealthData` — all values default to 0 on error.
 */
export async function queryDailyHealthData(): Promise<DailyHealthData> {
  const [steps, distanceM, calories, hr, restingHr, sleepMin, weight] =
    await Promise.all([
      queryTodaySteps(),
      queryTodayDistance(),
      queryTodayCalories(),
      queryTodayHeartRate(),
      queryRestingHeartRate(),
      queryTodaySleepMinutes(),
      queryLatestWeightKg(),
    ]);

  return {
    steps,
    distanceKm: Math.round((distanceM / 1000) * 100) / 100,
    caloriesBurned: calories,
    heartRate: {
      avg: hr.avg,
      max: hr.max,
      resting: restingHr,
    },
    sleepHours: Math.round((sleepMin / 60) * 10) / 10,
    weightKg: Math.round(weight * 10) / 10,
  };
}

/**
 * Fetch weekly aggregated health data.
 */
export async function queryWeeklyHealthData(): Promise<WeeklyHealthData> {
  try {
    const plugin = await ensurePlugin();
    const { startDate, endDate } = weekRange();

    const [stepsResult, distanceResult, caloriesResult] = await Promise.all([
      plugin.queryAggregated({
        dataType: "steps",
        startDate,
        endDate,
        bucket: "day",
        aggregation: "sum",
      }),
      plugin.queryAggregated({
        dataType: "distance",
        startDate,
        endDate,
        bucket: "day",
        aggregation: "sum",
      }),
      plugin.queryAggregated({
        dataType: "calories",
        startDate,
        endDate,
        bucket: "day",
        aggregation: "sum",
      }),
    ]);

    const totalSteps =
      stepsResult.samples?.reduce((acc, s) => acc + s.value, 0) ?? 0;
    const totalDistanceM =
      distanceResult.samples?.reduce((acc, s) => acc + s.value, 0) ?? 0;
    const totalCalories =
      caloriesResult.samples?.reduce((acc, s) => acc + s.value, 0) ?? 0;
    const daysWithData = stepsResult.samples?.filter((s) => s.value > 0).length || 1;

    return {
      totalSteps: Math.round(totalSteps),
      avgDailySteps: Math.round(totalSteps / daysWithData),
      totalDistanceKm: Math.round((totalDistanceM / 1000) * 100) / 100,
      totalCalories: Math.round(totalCalories),
      avgRestingHeartRate: 0, // not aggregated; would need per-day readSamples
      avgSleepHours: 0,
    };
  } catch {
    return {
      totalSteps: 0,
      avgDailySteps: 0,
      totalDistanceKm: 0,
      totalCalories: 0,
      avgRestingHeartRate: 0,
      avgSleepHours: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Open the Health Connect app's permissions page so the user can grant
 * permissions that were denied. Android-only, no-op on other platforms.
 */
export async function openHealthConnectSettings(): Promise<void> {
  try {
    const plugin = await ensurePlugin();
    await plugin.openHealthConnectSettings();
  } catch {
    // silently no-op on web
  }
}

/** Format steps with a locale-friendly thousands separator. */
export function formatSteps(count: number): string {
  return count.toLocaleString();
}

/** Format kcal for display. */
export function formatCalories(kcal: number): string {
  return `${Math.round(kcal).toLocaleString()}`;
}

/** Format heart rate for display. */
export function formatHeartRate(bpm: number): string {
  return bpm > 0 ? `${bpm}` : "--";
}
