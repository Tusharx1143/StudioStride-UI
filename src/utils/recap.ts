import type { UnifiedActivity } from "../sources/types";
import type { MetricValue, StatData } from "../types";
import type { DistanceUnit } from "./units";
import { distanceValue, elevationSuffix, formatDistance, paceSuffix } from "./units";

/**
 * Week / month in review.
 *
 * Every stat in the app is single-activity, but the aggregation is mostly
 * already written elsewhere: ActivitySourcesContext combines and sorts across
 * sources, and ProfileScreen already computes weekly rollups. This pulls that
 * into one tested place so a recap can be composed in the editor through the
 * ordinary pipeline rather than a parallel one.
 *
 * Recaps get shared on a predictable cadence, which is the retention loop a
 * story editor wants.
 */

export type RecapPeriod = "week" | "month";

export interface Recap {
  period: RecapPeriod;
  /** Inclusive lower bound. */
  since: string;
  activityCount: number;
  totalDistanceMeters: number;
  totalMovingSeconds: number;
  /** The longest single activity in the window, if there was one. */
  longest: UnifiedActivity | null;
  /** Activities with GPS, newest first — the route grid. */
  withRoutes: UnifiedActivity[];
  /** Every activity in the window, newest first. */
  activities: UnifiedActivity[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function periodStart(period: RecapPeriod, now: Date = new Date()): Date {
  const start = new Date(now.getTime());
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    // Monday-based: a "week in review" that starts mid-week reads as wrong.
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setTime(start.getTime() - daysSinceMonday * DAY_MS);
  } else {
    start.setDate(1);
  }

  return start;
}

/** Aggregates the activities falling inside the period. */
export function buildRecap(
  activities: UnifiedActivity[],
  period: RecapPeriod,
  now: Date = new Date()
): Recap {
  const since = periodStart(period, now);
  const sinceMs = since.getTime();
  const nowMs = now.getTime();

  const inWindow = activities
    .filter((a) => {
      const t = new Date(a.date).getTime();
      // Future-dated activities are clock skew, not next week's training.
      return Number.isFinite(t) && t >= sinceMs && t <= nowMs;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalDistanceMeters = inWindow.reduce((sum, a) => sum + (a.distanceMeters || 0), 0);
  const totalMovingSeconds = inWindow.reduce((sum, a) => sum + (a.movingTime || 0), 0);

  const longest = inWindow.reduce<UnifiedActivity | null>(
    (best, a) => (!best || a.distanceMeters > best.distanceMeters ? a : best),
    null
  );

  return {
    period,
    since: since.toISOString(),
    activityCount: inWindow.length,
    totalDistanceMeters,
    totalMovingSeconds,
    longest: longest && longest.distanceMeters > 0 ? longest : null,
    withRoutes: inWindow.filter((a) => Boolean(a.route)),
    activities: inWindow,
  };
}

/** "5h 42m", or "42m" under an hour. */
export function formatTotalTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0m";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** Average pace across the whole period, not the average of each pace. */
export function recapPace(recap: Recap, unit: DistanceUnit): string {
  const { totalDistanceMeters, totalMovingSeconds } = recap;
  if (totalDistanceMeters <= 0 || totalMovingSeconds <= 0) return "—";

  const metersPer = unit === "mi" ? 1609.344 : 1000;
  const secondsPerUnit = Math.round(totalMovingSeconds / (totalDistanceMeters / metersPer));
  const minutes = Math.floor(secondsPerUnit / 60);

  return `${minutes}:${String(secondsPerUnit % 60).padStart(2, "0")}`;
}

export function recapTitle(recap: Recap): string {
  return recap.period === "week" ? "Week in Review" : "Month in Review";
}

/**
 * A recap as StatData, so it composes in the editor through the same template
 * pipeline as a single activity — no parallel rendering path.
 */
export function recapToStatData(recap: Recap, unit: DistanceUnit): StatData {
  const metrics: Record<string, MetricValue> = {
    activity_count: {
      id: "activity_count",
      label: "Activities",
      value: String(recap.activityCount),
      unit: "",
      category: "Achievements",
      icon: "📅",
    },
  };

  if (recap.longest) {
    metrics.longest = {
      id: "longest",
      label: "Longest",
      value: formatDistance(recap.longest.distanceMeters, unit),
      unit,
      category: "Running",
      icon: "🏅",
    };
  }

  const elevation = recap.activities.reduce((sum, a) => {
    const gain = a.toStatData().metrics?.elev_gain?.value ?? "0";
    return sum + (parseFloat(gain.replace(/,/g, "")) || 0);
  }, 0);

  if (elevation > 0) {
    metrics.total_elev = {
      id: "total_elev",
      label: "Total Elevation",
      value: Math.round(elevation).toLocaleString(),
      unit: elevationSuffix(unit),
      category: "Elevation",
      icon: "⛰️",
    };
  }

  return {
    distance: distanceValue(recap.totalDistanceMeters, unit),
    distanceUnit: unit,
    pace: recapPace(recap, unit),
    time: formatTotalTime(recap.totalMovingSeconds),
    title: recapTitle(recap),
    metrics,
  };
}

/** Subtitle for the recap card, e.g. "4 activities · 5h 42m". */
export function recapSummary(recap: Recap, unit: DistanceUnit): string {
  if (recap.activityCount === 0) return "No activities yet";

  const distance = `${formatDistance(recap.totalDistanceMeters, unit)} ${unit}`;
  const count = `${recap.activityCount} ${recap.activityCount === 1 ? "activity" : "activities"}`;

  return `${count} · ${distance} · ${formatTotalTime(recap.totalMovingSeconds)}`;
}

/** Pace with its unit, for display next to the summary. */
export function recapPaceLabel(recap: Recap, unit: DistanceUnit): string {
  const pace = recapPace(recap, unit);
  return pace === "—" ? pace : `${pace} ${paceSuffix(unit)}`;
}
