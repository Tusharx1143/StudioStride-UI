/**
 * Splits, from Strava's detail response to the shape charts read.
 *
 * The list endpoint (`fetchActivities`) omits `splits_metric` entirely, so the
 * only way to get splits is a per-activity detail call. That call is cached:
 * an activity's splits never change once it is uploaded.
 */

import type { SplitSample, StravaActivity } from "../types";
import { fetchActivity } from "./stravaApi";

const METERS_PER_KM = 1000;

/**
 * Splits ready to plot, or undefined when the activity carries none.
 *
 * A final split is usually partial — 400m at the end of an 8.4km run — so pace
 * is normalised to seconds per kilometre rather than taken as the raw
 * duration, which would render the last bar as a wild outlier.
 */
export function toSplitSamples(activity: StravaActivity): SplitSample[] | undefined {
  const raw = activity.splits_metric;
  if (!raw || raw.length === 0) return undefined;

  const samples: SplitSample[] = [];

  for (const split of raw) {
    if (!split.distance || split.distance <= 0) continue;
    // A paused or GPS-glitched split can report zero moving time; elapsed is
    // the fallback, and a split with neither has no pace to plot.
    const seconds = split.moving_time || split.elapsed_time;
    if (!seconds || seconds <= 0) continue;

    samples.push({
      index: split.split,
      distanceMeters: split.distance,
      elapsed: seconds,
      paceSecondsPerKm: seconds / (split.distance / METERS_PER_KM),
    });
  }

  return samples.length > 0 ? samples : undefined;
}

/** Resolved splits per activity id. Splits are immutable once uploaded. */
const cache = new Map<number, SplitSample[] | undefined>();

/**
 * Splits for an activity, fetched once.
 *
 * A failure resolves to undefined rather than rejecting: a missing chart is
 * not worth an error state, and `available` already treats absence as "skip
 * this slot". The negative result is cached too, so a private or deleted
 * activity is not re-requested on every render.
 */
export async function fetchSplits(activityId: number): Promise<SplitSample[] | undefined> {
  if (cache.has(activityId)) return cache.get(activityId);

  try {
    const detail = await fetchActivity(activityId);
    const samples = toSplitSamples(detail);
    cache.set(activityId, samples);
    return samples;
  } catch {
    cache.set(activityId, undefined);
    return undefined;
  }
}

/** Test seam — drops every cached entry. */
export function clearSplitsCache(): void {
  cache.clear();
}
