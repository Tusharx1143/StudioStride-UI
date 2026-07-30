import { useSyncExternalStore } from "react";
import type { DistanceUnit } from "./units";
import { unitFromMeasurementPreference } from "./units";

/**
 * The user's chosen measurement system.
 *
 * A module-level store rather than a React context because the source adapters
 * need it too, and they are not components — `toUnifiedActivity` has to know
 * which unit to format into. Components subscribe through `useDistanceUnit`.
 *
 * Precedence: an explicit choice in Profile always wins over the athlete's
 * Strava preference, so changing it in one app doesn't silently override the
 * other.
 */

const STORAGE_KEY = "stride_distance_unit";

let current: DistanceUnit = readStored() ?? "km";
/** True once the user has chosen explicitly, which locks out athlete seeding. */
let isExplicit = readStored() !== null;

const listeners = new Set<() => void>();

function readStored(): DistanceUnit | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "km" || raw === "mi" ? raw : null;
  } catch {
    return null;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function getDistanceUnit(): DistanceUnit {
  return current;
}

/** An explicit choice from Profile. Persisted, and wins over the athlete. */
export function setDistanceUnit(unit: DistanceUnit): void {
  isExplicit = true;
  if (unit === current) return;

  current = unit;
  try {
    localStorage.setItem(STORAGE_KEY, unit);
  } catch {
    // Storage disabled — the choice still holds for this session.
  }
  emit();
}

/**
 * Seed from `StravaAthlete.measurement_preference`, which was typed at
 * `src/types.ts` and read nowhere until now. Ignored once the user has chosen.
 */
export function seedDistanceUnitFromAthlete(preference?: string): void {
  if (isExplicit) return;

  const next = unitFromMeasurementPreference(preference);
  if (next === current) return;

  current = next;
  emit();
}

export function subscribeToDistanceUnit(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribes a component to the current unit. */
export function useDistanceUnit(): DistanceUnit {
  return useSyncExternalStore(
    subscribeToDistanceUnit,
    getDistanceUnit,
    // Server snapshot — the app is client-only, but this keeps the hook honest.
    () => "km" as DistanceUnit
  );
}

/** Test seam: drops both the value and the "user chose" flag. */
export function resetDistanceUnitForTests(): void {
  current = "km";
  isExplicit = false;
  listeners.clear();
}
