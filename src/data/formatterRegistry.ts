/**
 * Registry of text formatter functions keyed by name strings.
 *
 * Admins pick formatters from a dropdown in the Stat Design builder.
 * At runtime the content service resolves the string reference back to
 * the actual function via this registry.
 *
 * Extract formatter implementations from `shared.ts` into this file so
 * the original `shared.ts` can re-export from here without breaking
 * existing imports.
 */

import type { StatData } from "../types";

type Formatter = (d: StatData) => string;

/**
 * Every formatter the admin builder can assign to a slot.
 * The key is the value stored in Firestore as `textFormatter`.
 */
export const FORMATTER_REGISTRY: Record<string, Formatter> = {
  dist1: (d) => d.distance.toFixed(1),
  dist2: (d) => d.distance.toFixed(2),
  distPadded: (d) => d.distance.toFixed(2).padStart(5, "0"),
  unit: (d) => d.distanceUnit,
  unitUpper: (d) => d.distanceUnit.toUpperCase(),
  pace: (d) => d.pace,
  time: (d) => d.time,
  title: (d) => d.title,
  dateShort: () =>
    new Date()
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase(),
  weekday: () =>
    new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
};

/**
 * Resolve a formatter name string to its function.
 * Returns a noop fallback for unknown names so rendering never crashes.
 */
export function resolveFormatter(name: string): Formatter {
  return FORMATTER_REGISTRY[name] ?? (() => "");
}

/** Human-readable labels for the admin builder dropdown. */
export const FORMATTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "dist1", label: "Distance (1 decimal)" },
  { value: "dist2", label: "Distance (2 decimals)" },
  { value: "distPadded", label: "Distance (padded)" },
  { value: "unit", label: "Distance unit" },
  { value: "unitUpper", label: "Distance unit (upper)" },
  { value: "pace", label: "Pace" },
  { value: "time", label: "Time" },
  { value: "title", label: "Activity title" },
  { value: "dateShort", label: "Short date" },
  { value: "weekday", label: "Weekday + date" },
];
