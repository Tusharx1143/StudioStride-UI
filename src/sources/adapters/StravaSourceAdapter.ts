/**
 * Strava activity source adapter.
 *
 * Wraps the existing stravaApi + stravaTransformers into the ActivitySource
 * interface. No changes to the underlying services.
 */

import type { ActivitySource, SourceFetchParams, SourceStats, UnifiedActivity } from "../types";
import type { StravaActivity } from "../../types";
import { fetchActivities, fetchAthleteStats, logout as apiLogout } from "../../services/stravaApi";
import { activityToStatData, activityToActivityData, aggregateTotals } from "../../services/stravaTransformers";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createStravaSourceAdapter(
  getAuthStatus: () => "loading" | "unauthenticated" | "authenticated",
  getAthleteId: () => number | null,
): ActivitySource {
  return {
    id: "strava",
    label: "Strava",
    color: "#FC4C02",
    iconName: "Activity",

    isAvailable: async () => true, // always available via web OAuth
    isConnected: () => getAuthStatus() === "authenticated",
    connect: () => {
      window.location.href = "/api/auth/login";
    },
    disconnect: async () => {
      try {
        await apiLogout();
      } catch {
        // clear locally even if server call fails
      }
    },

    fetchActivities: async (params?: SourceFetchParams) => {
      const raw = await fetchActivities({
        before: params?.before ? Math.floor(new Date(params.before).getTime() / 1000) : undefined,
        after: params?.after ? Math.floor(new Date(params.after).getTime() / 1000) : undefined,
        per_page: params?.limit ?? 10,
      });
      return (raw ?? []).map(toUnifiedActivity);
    },

    fetchStats: async () => {
      const id = getAthleteId();
      if (!id) {
        return {
          sourceId: "strava",
          totalActivities: 0,
          totalDistanceKm: 0,
          totalTimeFormatted: "0:00",
          totalElevationGainM: 0,
        };
      }
      const stats = await fetchAthleteStats(id);
      const all = aggregateTotals(
        stats.all_run_totals,
        stats.all_ride_totals,
        stats.all_swim_totals,
      );
      return {
        sourceId: "strava",
        totalActivities: all.count,
        totalDistanceKm: all.distanceKm,
        totalTimeFormatted: all.movingTimeFormatted,
        totalElevationGainM: all.elevationGainM,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function toUnifiedActivity(a: StravaActivity): UnifiedActivity {
  const ad = activityToActivityData(a);
  const statData = activityToStatData(a);
  const distKm = a.distance / 1000;

  return {
    id: ad.id,
    sourceId: "strava",
    title: ad.title,
    subtitle: ad.subtitle,
    type: ad.type,
    iconType: ad.iconType,
    displayDistance: distKm.toFixed(1),
    displayDistanceUnit: "km",
    displayTime: ad.time,
    displayPace: `${ad.pace} /km`,
    displayTimeAgo: ad.timeAgo,
    date: a.start_date_local,
    distanceMeters: a.distance,
    movingTime: a.moving_time || a.elapsed_time,
    toStatData: () => statData,
  };
}
