import type { ReactNode } from "react";
import type { RouteGeometry } from "./utils/routeGeometry";

export type { RouteGeometry };

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

/**
 * A route path placed on the canvas.
 *
 * Declared here rather than in the editor component so the preview, the
 * export pass, and saved projects all share one definition — TextOverlay and
 * StickerOverlay are currently duplicated across EditorScreen and ExportModal,
 * and two copies of a shape that must agree is exactly the drift this feature
 * is built to avoid.
 */
export interface RouteOverlay {
  id: string;
  /** Normalized geometry from the activity source. */
  geometry: RouteGeometry;
  /** Centre offset in preview px, matching every other overlay. */
  x: number;
  y: number;
  /** Longest edge in preview px. */
  size: number;
  color: string;
  /** Stroke width in preview px. */
  strokeWidth: number;
  opacity: number;
  /** Applied by DraggableLayer as a CSS transform; export mirrors it. */
  scale?: number;
  rotation?: number;
  zIndex?: number;
  hidden?: boolean;
  locked?: boolean;
}

/**
 * A line of user text placed on the canvas.
 *
 * Lives here rather than in EditorScreen because the editor, the exporter, and
 * the saved-project document all have to agree on it. Two hand-maintained
 * copies is exactly the drift this file exists to prevent.
 */
export interface TextOverlay {
  id: string;
  text: string;
  /** Centre offset in preview px, matching every other overlay. */
  x: number;
  y: number;
  color: string;
  fontStyle: "Classic" | "Modern" | "Bold" | "Neon" | "Serif" | "Typewriter";
  bgStyle: "none" | "solid" | "semi" | "outline";
  align: "left" | "center" | "right";
  fontSize: number;
  /** Set by the pinch/rotate gesture. */
  rotation?: number;
  scale?: number;
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
}

/** An emoji, badge, metric chip, or location tag placed on the canvas. */
export interface StickerOverlay {
  id: string;
  /** Emoji, SVG badge text, or image URL. */
  content: string;
  type: "emoji" | "badge" | "metric" | "location";
  scale: number;
  rotation: number;
  x: number;
  y: number;
  bgGradient?: string;
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
}

/** Crop/orientation the user committed from the image tool. */
export interface CommittedCrop {
  ratio: string;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

/**
 * A complete capture of the editor's canvas state.
 *
 * Drives undo/redo, and — extended by EditorDoc — is what a saved project
 * stores. One shape for both, so a project can never drift from what undo
 * already knows how to restore.
 */
export interface EditorSnapshot {
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  templateId: string;
  statLayout: TemplateLayout;
  capturedImage: string;
  /** Serialised as an array so the snapshot stays a plain JSON value. */
  hiddenSlots: StatSlotId[];
  committedCrop: CommittedCrop;
  isBaseImageHidden: boolean;
  isBaseImageLocked: boolean;
  baseImageZIndex: number;
  imagePerspectiveX: number;
  imagePerspectiveY: number;
  imageShadowBlur: number;
  imageShadowOffsetY: number;
  imageShadowColor: string;
  isDrawingHidden: boolean;
  isDrawingLocked: boolean;
  drawingZIndex: number;
  drawingCanvasDataUrl?: string | null;
  hasDrawnStrokes: boolean;
  /**
   * The placed route layer. Part of the snapshot so undo restores it — before
   * this field existed, undoing past a route edit silently dropped the layer.
   */
  routeOverlay: RouteOverlay | null;
}

/**
 * Everything needed to rebuild a canvas from scratch: the snapshot undo uses,
 * plus the four things that live outside it.
 */
export interface EditorDoc extends EditorSnapshot {
  /** Kept even when the route is unplaced, so the Route tool survives reopen. */
  routeGeometry: RouteGeometry | null;
  lensFilter: string;
  filterIntensity: number;
  /** Frozen at save — the upstream activity may later change or vanish. */
  statData: StatData;
}

/**
 * A saved project: the document, and a small thumbnail to show for it.
 *
 * The two are deliberately separate. Storing only a flattened export — as this
 * type used to — meant reopening a project handed you a baked bitmap as your
 * background photo, with every layer fused into it.
 */
export interface SavedProject {
  id: string;
  title: string;
  /** ISO 8601. Relative phrasing is a render concern, and cannot be sorted. */
  updatedAt: string;
  doc: EditorDoc;
  /** JPEG data URL, ≤320px on the long edge, ~40 KB. */
  thumbnail: string;
}

/** The in-progress canvas, autosaved so an accidental exit costs nothing. */
export interface EditorDraft {
  key: "draft";
  /** Set when the draft belongs to a project already saved. */
  projectId: string | null;
  title: string;
  savedAt: string;
  doc: EditorDoc;
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
