/**
 * Activity source registry.
 *
 * Central list of all known activity source types. Used by the AuthScreen
 * to render login buttons dynamically, and by the ActivitySourcesContext
 * to know which adapters to instantiate.
 *
 * Adding a new source: create the adapter, add an entry here with
 * `enabled: true`, and wire it in ActivitySourcesContext.
 */

import type { SourceDefinition } from "./types";

export const SOURCE_REGISTRY: SourceDefinition[] = [
  {
    id: "strava",
    label: "Strava",
    color: "#FC4C02", // Strava orange
    iconName: "Activity",
    enabled: true,
  },
  {
    id: "healthconnect",
    label: "Health Connect",
    color: "#10B981", // emerald
    iconName: "Heart",
    enabled: true,
  },
  // Future sources (set enabled: true when the adapter exists):
  // {
  //   id: "applehealth",
  //   label: "Apple Health",
  //   color: "#FF2D55",
  //   iconName: "Apple",
  //   enabled: false,
  // },
];

/** Return only enabled source definitions. */
export function getEnabledSources(): SourceDefinition[] {
  return SOURCE_REGISTRY.filter((s) => s.enabled);
}
