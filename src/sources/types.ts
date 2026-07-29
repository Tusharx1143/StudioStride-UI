/**
 * Unified activity type and source interface for pluggable activity sources.
 *
 * Every data source (Strava, Health Connect, Apple Health, …) implements
 * the `ActivitySource` interface so the app can treat all activities the
 * same way — combined, sorted, filtered, and displayed together.
 */

import type { StatData } from "../types";

// ---------------------------------------------------------------------------
// Source identification
// ---------------------------------------------------------------------------

export type ActivitySourceId = "strava" | "healthconnect" | "applehealth" | "mock";

// ---------------------------------------------------------------------------
// Unified activity — the common shape all sources produce
// ---------------------------------------------------------------------------

export interface UnifiedActivity {
  /** Globally unique ID: "<sourceId>_<nativeId>" */
  id: string;
  /** Which source produced this activity. */
  sourceId: ActivitySourceId;

  // ── Display fields ────────────────────────────────────────────────────
  title: string;
  subtitle: string;
  /** Activity type label, e.g. "Run", "Walk", "Cycling", "Workout". */
  type: string;
  /** Icon category for rendering the card icon. */
  iconType: "activity" | "target" | "flame" | "mountain";

  // ── Pre-computed display strings ──────────────────────────────────────
  displayDistance: string;   // "8.4"
  displayDistanceUnit: string; // "km"
  displayTime: string;       // "52:18"
  displayPace: string;       // "6:12 /km"
  displayTimeAgo: string;    // "2h ago" / "Today"

  // ── Raw values for sorting / filtering ─────────────────────────────────
  /** ISO 8601 — primary sort key. */
  date: string;
  /** Distance in meters — for cross-source comparison. */
  distanceMeters: number;
  /** Moving time in seconds. */
  movingTime: number;

  // ── Camera / Editor pipeline ──────────────────────────────────────────
  /** Generate a StatData object for templates, overlays, and export. */
  toStatData(): StatData;
}

// ---------------------------------------------------------------------------
// Source fetch parameters (optional pagination / date range)
// ---------------------------------------------------------------------------

export interface SourceFetchParams {
  limit?: number;
  before?: string; // ISO date — exclusive upper bound
  after?: string;  // ISO date — inclusive lower bound
}

// ---------------------------------------------------------------------------
// Per-source aggregate stats
// ---------------------------------------------------------------------------

export interface SourceStats {
  sourceId: ActivitySourceId;
  totalActivities: number;
  totalDistanceKm: number;
  totalTimeFormatted: string;
  totalElevationGainM: number;
}

// ---------------------------------------------------------------------------
// Activity source interface — implemented by every data source
// ---------------------------------------------------------------------------

export interface ActivitySource {
  /** Stable identifier matching ActivitySourceId. */
  readonly id: ActivitySourceId;
  /** Human-readable name shown in UI (e.g. "Strava", "Health Connect"). */
  readonly label: string;
  /** Brand color (hex) for the source badge. */
  readonly color: string;
  /** Lucide icon name for the source badge. */
  readonly iconName: string;

  // ── Lifecycle ─────────────────────────────────────────────────────────

  /** Whether this source can work on the current platform. */
  isAvailable(): Promise<boolean>;
  /** Whether the user is currently authenticated / authorized. */
  isConnected(): boolean;
  /** Initiate authentication / permission flow. */
  connect(): void | Promise<void>;
  /** Disconnect / clear session. */
  disconnect(): void | Promise<void>;

  // ── Data ──────────────────────────────────────────────────────────────

  /** Fetch a page of activities from this source. */
  fetchActivities(params?: SourceFetchParams): Promise<UnifiedActivity[]>;
  /** Fetch aggregate stats (optional — may not be supported by all sources). */
  fetchStats?(): Promise<SourceStats>;
}

// ---------------------------------------------------------------------------
// Source definition (lightweight metadata for registry / UI)
// ---------------------------------------------------------------------------

export interface SourceDefinition {
  id: ActivitySourceId;
  label: string;
  color: string;
  iconName: string;
  enabled: boolean;
}
