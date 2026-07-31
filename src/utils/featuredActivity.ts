/**
 * Which activity sits in the "Ready to share" card, and which fall into the
 * list below it.
 *
 * Kept separate from HomeScreen so the promotion rules — including what
 * happens when a filter removes whatever was featured — can be tested without
 * standing up the screen's contexts.
 */

import type { UnifiedActivity } from "../sources/types";

export interface ActivityPartition {
  featured: UnifiedActivity | null;
  previous: UnifiedActivity[];
}

/**
 * `featuredId` is the activity the user promoted, or null for the default.
 * An id that is no longer present — a filter changed under it — falls back to
 * the newest activity rather than leaving the card empty.
 */
export function partitionActivities(
  activities: UnifiedActivity[],
  featuredId: string | null
): ActivityPartition {
  if (activities.length === 0) return { featured: null, previous: [] };

  const featured =
    (featuredId ? activities.find((a) => a.id === featuredId) : undefined) ?? activities[0];

  return {
    featured,
    // Order is preserved, so a demoted card returns to its place in the
    // timeline instead of jumping to the top of the list.
    previous: activities.filter((a) => a.id !== featured.id),
  };
}
