/**
 * Mock activity source — provides demo data for development / web fallback.
 *
 * Activates automatically when no real data source is connected.
 */

import type { ActivitySource, UnifiedActivity } from "../types";
import { getDistanceUnit } from "../../utils/unitPreference";
import {
  distanceValue,
  formatDistance as formatDistanceInUnit,
  formatPace as formatPaceInUnit,
  paceSuffix,
} from "../../utils/units";

// ---------------------------------------------------------------------------
// Mock activities (preserved from HomeScreen's INITIAL_ACTIVITIES)
// ---------------------------------------------------------------------------

/** Re-derives the unit-dependent fields of a fixture. */
function withCurrentUnit(activity: UnifiedActivity): UnifiedActivity {
  const unit = getDistanceUnit();
  const { distanceMeters, movingTime } = activity;

  return {
    ...activity,
    displayDistance: formatDistanceInUnit(distanceMeters, unit),
    displayDistanceUnit: unit,
    displayPace: `${formatPaceInUnit(distanceMeters, movingTime, unit)} ${paceSuffix(unit)}`,
    toStatData: () => ({
      ...activity.toStatData(),
      distance: distanceValue(distanceMeters, unit),
      distanceUnit: unit,
      pace: formatPaceInUnit(distanceMeters, movingTime, unit),
    }),
  };
}

const MOCK_ACTIVITIES: UnifiedActivity[] = [
  {
    id: "mock_1",
    sourceId: "mock",
    title: "Morning Run",
    subtitle: "Golden Gate Park",
    type: "Run",
    iconType: "activity",
    displayDistance: "8.4",
    displayDistanceUnit: "km",
    displayTime: "52:18",
    displayPace: "6:12 /km",
    displayTimeAgo: "2h ago",
    date: new Date(Date.now() - 2 * 3600_000).toISOString(),
    distanceMeters: 8400,
    movingTime: 3138,
    toStatData: () => ({
      distance: 8.4,
      distanceUnit: "km",
      pace: "6:12",
      time: "52:18",
      title: "Morning Run",
    }),
  },
  {
    id: "mock_2",
    sourceId: "mock",
    title: "Cycling Sprint",
    subtitle: "Marin Headlands Loop",
    type: "Cycling",
    iconType: "target",
    displayDistance: "35.2",
    displayDistanceUnit: "km",
    displayTime: "1:45:32",
    displayPace: "2:59 /km",
    displayTimeAgo: "Yesterday",
    date: new Date(Date.now() - 24 * 3600_000).toISOString(),
    distanceMeters: 35200,
    movingTime: 6332,
    toStatData: () => ({
      distance: 35.2,
      distanceUnit: "km",
      pace: "2:59",
      time: "1:45:32",
      title: "Cycling Sprint",
    }),
  },
  {
    id: "mock_3",
    sourceId: "mock",
    title: "Evening Walk",
    subtitle: "Sunset Boulevard",
    type: "Walk",
    iconType: "activity",
    displayDistance: "6.1",
    displayDistanceUnit: "km",
    displayTime: "48:12",
    displayPace: "7:54 /km",
    displayTimeAgo: "2 days ago",
    date: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(),
    distanceMeters: 6100,
    movingTime: 2892,
    toStatData: () => ({
      distance: 6.1,
      distanceUnit: "km",
      pace: "7:54",
      time: "48:12",
      title: "Evening Walk",
    }),
  },
  {
    id: "mock_4",
    sourceId: "mock",
    title: "Mountain Trail Run",
    subtitle: "Mount Tamalpais",
    type: "Trail Run",
    iconType: "mountain",
    displayDistance: "12.8",
    displayDistanceUnit: "km",
    displayTime: "1:18:45",
    displayPace: "6:08 /km",
    displayTimeAgo: "4 days ago",
    date: new Date(Date.now() - 4 * 24 * 3600_000).toISOString(),
    distanceMeters: 12800,
    movingTime: 4725,
    toStatData: () => ({
      distance: 12.8,
      distanceUnit: "km",
      pace: "6:08",
      time: "1:18:45",
      title: "Mountain Trail Run",
    }),
  },
];

// ---------------------------------------------------------------------------
// Source instance
// ---------------------------------------------------------------------------

export const MOCK_SOURCE: ActivitySource = {
  id: "mock",
  label: "Demo Data",
  color: "#6B7280",
  iconName: "Sparkles",

  isAvailable: async () => true,
  isConnected: () => true, // always "connected" — no auth needed
  connect: () => {},
  disconnect: () => {},

  // Display strings are derived from the raw metres/seconds each fixture
  // already carries, so the demo feed honours the user's unit rather than
  // showing km to someone who has chosen miles.
  fetchActivities: async () => MOCK_ACTIVITIES.map(withCurrentUnit),
};
