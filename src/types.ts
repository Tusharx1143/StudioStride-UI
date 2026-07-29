import type { ReactNode } from "react";

/** The fixed set of draggable pieces every template decomposes into. */
export type StatSlotId = "distance" | "pace" | "time" | "title" | "accent";

/** Position of a slot's top-left anchor, as a percentage of the canvas. */
export interface SlotPosition {
  x: number;
  y: number;
}

/** A key being absent means the template does not use that slot. */
export type TemplateLayout = Partial<Record<StatSlotId, SlotPosition>>;

/** Custom layouts the user has dragged, keyed by template id. */
export type CustomLayouts = Record<string, TemplateLayout>;

export interface StatData {
  distance: number;
  distanceUnit: string;
  pace: string;
  time: string;
  title: string;
}

export interface SlotBackground {
  fill: string;
  radius: number;
  padX: number;
  padY: number;
  border?: string;
  /** Rendered as backdrop-blur in the DOM; approximated by a solid fill on canvas. */
  blur?: boolean;
}

export interface SlotShadow {
  color: string;
  blur: number;
  x?: number;
  y?: number;
}

/**
 * A single stat chip's look. Sizes are expressed against a 390px reference
 * width and scaled by canvasWidth / 390, so one table drives both the phone
 * viewfinder and a full-resolution export.
 */
export interface SlotStyle {
  text: (d: StatData) => string;
  /** Smaller trailing token rendered inline, e.g. the distance unit. */
  suffix?: (d: StatData) => string;
  suffixScale?: number;
  suffixColor?: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  italic?: boolean;
  uppercase?: boolean;
  letterSpacing?: number;
  rotation?: number;
  bg?: SlotBackground;
  shadow?: SlotShadow;
}

/** Pixel origin and font scale handed to a template's accent painter. */
export interface SlotBox {
  x: number;
  y: number;
  scale: number;
}

/** Every slot except `accent`, which is drawn rather than typeset. */
export type TextSlotId = Exclude<StatSlotId, "accent">;

export interface TemplateStatDesign {
  slots: Partial<Record<TextSlotId, SlotStyle>>;
  defaultLayout: TemplateLayout;
  /** Non-textual decoration (rings, bars, quote marks) rendered in the DOM. */
  accentRender?: (d: StatData) => ReactNode;
  /** Canvas twin of accentRender, used by the exporter. */
  accentDraw?: (ctx: CanvasRenderingContext2D, box: SlotBox, d: StatData) => void;
}

export interface MetricOption {
  id: string;
  label: string;
  value: string;
  unit: string;
  category: "Running" | "Performance" | "Elevation" | "Ride" | "Achievements";
  icon: string;
}

export interface EditableLensElement {
  id: string;
  metricId?: string; // e.g. 'distance', 'pace', 'heart_rate', etc.
  type: "text" | "metric" | "badge" | "sticker" | "route_graphic";
  content: string; // fallback or raw text
  x: number; // percentage from left
  y: number; // percentage from top
  fontSize: number; // in px
  fontFamily: string; // 'Plus Jakarta Sans' | 'Space Grotesk' | 'Playfair Display' | 'Courier New' | 'Impact'
  fontWeight: string; // '400' | '600' | '800' | '900'
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  color: string;
  bgFill?: string;
  bgOpacity?: number;
  borderRadius?: number;
  rotation?: number; // degrees
  scale?: number;
  opacity?: number;
  shadowBlur?: number;
  shadowColor?: string;
  isLocked?: boolean;
}

export interface LensTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  tagline: string;
  badgeColor: string;
  overlayType: "minimal" | "strava" | "cyberpunk" | "vintage" | "route" | "trophy" | "music" | "custom";
  defaultElements: EditableLensElement[];
  isFavorite?: boolean;
}

export interface PhotoSource {
  id: string;
  name: string;
  category: "Stock Running" | "Cycling & Trails" | "Track & Night" | "Preset Gradients" | "Minimal";
  url: string;
  thumbnailUrl?: string;
}

export interface SavedProject {
  id: string;
  title: string;
  activityType: string;
  date: string;
  bgImage: string;
  lensId: string;
  elements: EditableLensElement[];
  distance: string;
  pace: string;
  time: string;
  updatedAt: string;
  placedTextsCount: number;
}

export interface TemplateFamily {
  id: string;
  name: string;
  category: string;
  icon: string;
  tagline: string;
  accentColor: string;
}

// ====================================================================
// Strava API Response Types
// ====================================================================

/** Summary athlete returned by GET /athlete */
export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  premium: boolean;
  created_at: string;
  updated_at: string;
  follower_count?: number;
  friend_count?: number;
  measurement_preference?: string;
  weight?: number;
  bikes?: StravaGear[];
  shoes?: StravaGear[];
}

export interface StravaGear {
  id: string;
  name: string;
  distance: number;
}

/** Summary activity from GET /athlete/activities */
export interface StravaActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  type: string;
  sport_type: string;
  start_date: string; // ISO 8601
  start_date_local: string; // ISO 8601
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_watts?: number;
  has_heartrate: boolean;
  suffer_score?: number;
  map?: { summary_polyline?: string };
  total_elevation_gain?: number;
  calories?: number;
  kudos_count: number;
  achievement_count: number;
  gear_id?: string;
  average_heartrate?: number;
  max_heartrate?: number;
  elev_high?: number;
  elev_low?: number;
}

/** Activity stats from GET /athletes/{id}/stats */
export interface StravaActivityStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_run_totals: StravaTotals;
  recent_ride_totals: StravaTotals;
  recent_swim_totals: StravaTotals;
  ytd_run_totals: StravaTotals;
  ytd_ride_totals: StravaTotals;
  ytd_swim_totals: StravaTotals;
  all_run_totals: StravaTotals;
  all_ride_totals: StravaTotals;
  all_swim_totals: StravaTotals;
}

export interface StravaTotals {
  count: number;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  elevation_gain: number; // meters
}

// ====================================================================
// Auth Types
// ====================================================================

export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  athlete: StravaAthlete | null;
  error: string | null;
}

// ====================================================================
// Google Health Connect Types
// ====================================================================

/** Current state of Health Connect on the device. */
export interface HealthConnectState {
  available: boolean;
  authorized: boolean;
  loading: boolean;
  error: string | null;
}

/** Daily health snapshot aggregated from Health Connect. */
export interface DailyHealthData {
  steps: number;
  distanceKm: number;
  caloriesBurned: number;
  heartRate: { avg: number; max: number; resting: number };
  sleepHours: number;
  weightKg: number;
}

/** Weekly aggregated health stats. */
export interface WeeklyHealthData {
  totalSteps: number;
  avgDailySteps: number;
  totalDistanceKm: number;
  totalCalories: number;
  avgRestingHeartRate: number;
  avgSleepHours: number;
}

/** Health Connect permission group — which data types we need to read. */
export const HEALTH_PERMISSION_TYPES = [
  "steps",
  "distance",
  "calories",
  "heartRate",
  "sleep",
  "weight",
] as const;

export type HealthPermissionType = (typeof HEALTH_PERMISSION_TYPES)[number];

// ====================================================================
// API Error Classes
// ====================================================================

export class AuthExpiredError extends Error {
  constructor() {
    super("Authentication expired");
    this.name = "AuthExpiredError";
  }
}

export class StravaApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "StravaApiError";
    this.status = status;
  }
}
