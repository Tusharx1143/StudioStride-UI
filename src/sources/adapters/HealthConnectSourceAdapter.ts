/**
 * Health Connect activity source adapter.
 *
 * Wraps Health Connect plugin data into the ActivitySource interface.
 * Produces two kinds of activity entries:
 *   1. Structured workouts from queryWorkouts() (running, cycling, etc.)
 *   2. Daily step summary as a synthetic "Daily Activity" entry
 *
 * Web fallback: returns mock data when the plugin is unavailable.
 */

import type { ActivitySource, SourceFetchParams, SourceStats, UnifiedActivity } from "../types";
import type { DailyHealthData } from "../../types";
import { dailyHealthToStatData } from "../../services/healthConnectTransformers";

// ---------------------------------------------------------------------------
// Health Connect plugin — lazy import (throws at runtime on web)
// ---------------------------------------------------------------------------

let HealthPlugin: any = null;

async function getPlugin() {
  if (HealthPlugin) return HealthPlugin;
  try {
    const mod = await import("@capgo/capacitor-health");
    HealthPlugin = mod.Health;
    return HealthPlugin;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Workout type → app activity type mapping
// ---------------------------------------------------------------------------

function mapWorkoutType(wt: string): {
  type: string;
  iconType: "activity" | "target" | "flame" | "mountain";
} {
  const t = wt?.toLowerCase() ?? "";
  if (["running", "treadmillrunning", "trailrunning", "runningrace"].some((k) => t.includes(k))) {
    return { type: "Run", iconType: "activity" as const };
  }
  if (["cycling", "mountainbiking", "indoorcycling", "handcycling", "cyclingrace"].some((k) => t.includes(k))) {
    return { type: "Cycling", iconType: "target" as const };
  }
  if (["walking", "hiking", "snowshoeing", "stairclimbing"].some((k) => t.includes(k))) {
    return { type: "Walk", iconType: "mountain" as const };
  }
  if (["strengthtraining", "highintensityintervaltraining", "crossfit", "functionalstrengthtraining", "traditionalstrengthtraining", "coretraining", "flexibility"].some((k) => t.includes(k))) {
    return { type: "Workout", iconType: "flame" as const };
  }
  if (["swimming", "openwater", "pool"].some((k) => t.includes(k))) {
    return { type: "Swim", iconType: "activity" as const };
  }
  if (["yoga", "pilates", "barre"].some((k) => t.includes(k))) {
    return { type: "Yoga", iconType: "flame" as const };
  }
  return { type: "Other", iconType: "activity" as const };
}

// ---------------------------------------------------------------------------
// Format helpers (matches stravaTransformers formatDuration + formatPace)
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return "--:--";
  const secondsPerKm = Math.round(1000 / metersPerSecond);
  const min = Math.floor(secondsPerKm / 60);
  const sec = secondsPerKm % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function timeAgo(isoDate: string): string {
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
  return new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createHealthConnectSourceAdapter(
  getHealthData: () => DailyHealthData | null,
  getState: () => { available: boolean; authorized: boolean; loading: boolean },
  doConnect: () => Promise<void>,
  doDisconnect: () => void,
): ActivitySource {
  return {
    id: "healthconnect",
    label: "Health Connect",
    color: "#10B981",
    iconName: "Heart",

    isAvailable: async () => getState().available,
    isConnected: () => getState().authorized,
    connect: doConnect,
    disconnect: doDisconnect,

    fetchActivities: async (_params?: SourceFetchParams) => {
      const results: UnifiedActivity[] = [];

      // ── Try real workouts from the plugin ──────────────────────────────
      const plugin = await getPlugin();
      if (plugin) {
        try {
          const endDate = new Date().toISOString();
          const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const workoutResult = await plugin.queryWorkouts({
            startDate,
            endDate,
            limit: _params?.limit ?? 20,
          });
          const workouts = workoutResult.workouts ?? [];
          for (const w of workouts) {
            const mapped = mapWorkoutType(w.workoutType);
            const distM = w.totalDistance ?? 0;
            const durS = w.duration ?? 0;
            const avgSpeed = durS > 0 ? distM / durS : 0;
            results.push({
              id: `hcw_${w.platformId ?? results.length}`,
              sourceId: "healthconnect",
              title: mapped.type,
              subtitle: w.sourceName ?? "Health Connect",
              type: mapped.type,
              iconType: mapped.iconType,
              displayDistance: (distM / 1000).toFixed(1),
              displayDistanceUnit: "km",
              displayTime: formatDuration(durS),
              displayPace: `${formatPace(avgSpeed)} /km`,
              displayTimeAgo: timeAgo(w.startDate),
              date: w.startDate,
              distanceMeters: distM,
              movingTime: durS,
              toStatData: () => ({
                distance: distM / 1000,
                distanceUnit: "km",
                pace: formatPace(avgSpeed),
                time: formatDuration(durS),
                title: mapped.type,
              }),
            });
          }
        } catch {
          // plugin call failed — fall through to daily data
        }
      }

      // ── Add the daily step summary from context data ───────────────────
      const daily = getHealthData();
      if (daily && daily.steps > 0) {
        const today = new Date().toISOString();
        const walkingMinutes = Math.round(daily.steps / 100);
        const paceMin = daily.distanceKm > 0
          ? Math.round(walkingMinutes / daily.distanceKm) : 0;
        const paceSec = daily.distanceKm > 0
          ? Math.round((walkingMinutes / daily.distanceKm - paceMin) * 60) : 0;

        results.push({
          id: "hc_daily_steps",
          sourceId: "healthconnect",
          title: "Daily Activity",
          subtitle: `${daily.steps.toLocaleString()} steps`,
          type: "Walk",
          iconType: "activity",
          displayDistance: daily.distanceKm > 0 ? daily.distanceKm.toFixed(1) : "0.0",
          displayDistanceUnit: "km",
          displayTime: formatDuration(walkingMinutes * 60),
          displayPace: daily.distanceKm > 0
            ? `${paceMin}:${paceSec.toString().padStart(2, "0")} /km`
            : "--:-- /km",
          displayTimeAgo: "Today",
          date: today,
          distanceMeters: daily.distanceKm * 1000,
          movingTime: walkingMinutes * 60,
          toStatData: () => dailyHealthToStatData(daily),
        });
      }

      return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    fetchStats: async () => {
      // Health Connect doesn't have a cross-day stats API —
      // we could aggregate from weekly data in a future iteration.
      return {
        sourceId: "healthconnect",
        totalActivities: 0,
        totalDistanceKm: 0,
        totalTimeFormatted: "0:00",
        totalElevationGainM: 0,
      };
    },
  };
}
