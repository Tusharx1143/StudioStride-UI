import type {
  CommittedCrop,
  EditorDoc,
  RouteGeometry,
  RouteOverlay,
  StatData,
  StatSlotId,
  StickerOverlay,
  TemplateLayout,
  TextOverlay,
} from "../types";

/**
 * Pure document logic for saved projects.
 *
 * Everything here is deliberately free of React, the DOM, and IndexedDB, so
 * the parts that can actually be wrong are testable — `projectStore.ts` is
 * left as thin I/O around these.
 */

/** Defaults mirroring the inline fallbacks the editor's applySnapshot uses. */
const DEFAULT_CROP: CommittedCrop = {
  ratio: "9:16",
  rotation: 0,
  flipH: false,
  flipV: false,
};

const DEFAULT_STAT_DATA: StatData = {
  distance: 0,
  distanceUnit: "km",
  pace: "—",
  time: "—",
  title: "Untitled",
};

export const DEFAULT_FILTER_INTENSITY = 85;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Detaches from React state, so later edits can't mutate a saved document. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface EditorDocParts {
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  templateId: string;
  statLayout: TemplateLayout;
  capturedImage: string;
  /** Accepts the editor's Set directly; stored as a sorted array. */
  hiddenSlots: Iterable<StatSlotId>;
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
  routeOverlay: RouteOverlay | null;
  routeGeometry: RouteGeometry | null;
  lensFilter: string;
  filterIntensity: number;
  statData: StatData;
}

/**
 * Assembles a document from live editor state.
 *
 * `hiddenSlots` is sorted rather than taken in Set-iteration order so two
 * documents with the same hidden stats always compare equal.
 */
export function buildDoc(parts: EditorDocParts): EditorDoc {
  return {
    textOverlays: clone(parts.textOverlays),
    stickerOverlays: clone(parts.stickerOverlays),
    templateId: parts.templateId,
    statLayout: clone(parts.statLayout),
    capturedImage: parts.capturedImage,
    hiddenSlots: [...parts.hiddenSlots].sort(),
    committedCrop: { ...parts.committedCrop },
    isBaseImageHidden: parts.isBaseImageHidden,
    isBaseImageLocked: parts.isBaseImageLocked,
    baseImageZIndex: parts.baseImageZIndex,
    imagePerspectiveX: parts.imagePerspectiveX,
    imagePerspectiveY: parts.imagePerspectiveY,
    imageShadowBlur: parts.imageShadowBlur,
    imageShadowOffsetY: parts.imageShadowOffsetY,
    imageShadowColor: parts.imageShadowColor,
    isDrawingHidden: parts.isDrawingHidden,
    isDrawingLocked: parts.isDrawingLocked,
    drawingZIndex: parts.drawingZIndex,
    drawingCanvasDataUrl: parts.drawingCanvasDataUrl ?? null,
    hasDrawnStrokes: parts.hasDrawnStrokes,
    routeOverlay: parts.routeOverlay ? clone(parts.routeOverlay) : null,
    routeGeometry: parts.routeGeometry ? clone(parts.routeGeometry) : null,
    lensFilter: parts.lensFilter,
    filterIntensity: parts.filterIntensity,
    statData: { ...parts.statData },
  };
}

/**
 * Reads an untrusted document — from storage, or written by an older build —
 * and fills anything missing.
 *
 * Returns null only when there is nothing to rebuild a canvas from. A document
 * without a background image cannot be opened; every other field has a
 * defensible default.
 */
export function normalizeDoc(raw: unknown): EditorDoc | null {
  if (!isRecord(raw)) return null;

  const capturedImage = raw.capturedImage;
  if (typeof capturedImage !== "string" || capturedImage === "") return null;

  const statData = isRecord(raw.statData) ? raw.statData : {};
  const crop = isRecord(raw.committedCrop) ? raw.committedCrop : {};

  return {
    textOverlays: arr<TextOverlay>(raw.textOverlays),
    stickerOverlays: arr<StickerOverlay>(raw.stickerOverlays),
    templateId: str(raw.templateId, ""),
    statLayout: isRecord(raw.statLayout) ? (raw.statLayout as TemplateLayout) : {},
    capturedImage,
    hiddenSlots: arr<StatSlotId>(raw.hiddenSlots).slice().sort(),
    committedCrop: {
      ratio: str(crop.ratio, DEFAULT_CROP.ratio),
      rotation: num(crop.rotation, DEFAULT_CROP.rotation),
      flipH: bool(crop.flipH, DEFAULT_CROP.flipH),
      flipV: bool(crop.flipV, DEFAULT_CROP.flipV),
    },
    isBaseImageHidden: bool(raw.isBaseImageHidden, false),
    isBaseImageLocked: bool(raw.isBaseImageLocked, false),
    baseImageZIndex: num(raw.baseImageZIndex, 0),
    imagePerspectiveX: num(raw.imagePerspectiveX, 0),
    imagePerspectiveY: num(raw.imagePerspectiveY, 0),
    imageShadowBlur: num(raw.imageShadowBlur, 0),
    imageShadowOffsetY: num(raw.imageShadowOffsetY, 10),
    imageShadowColor: str(raw.imageShadowColor, "#000000"),
    isDrawingHidden: bool(raw.isDrawingHidden, false),
    isDrawingLocked: bool(raw.isDrawingLocked, false),
    drawingZIndex: num(raw.drawingZIndex, 30),
    drawingCanvasDataUrl:
      typeof raw.drawingCanvasDataUrl === "string" ? raw.drawingCanvasDataUrl : null,
    hasDrawnStrokes: bool(raw.hasDrawnStrokes, false),
    routeOverlay: isRecord(raw.routeOverlay) ? (raw.routeOverlay as unknown as RouteOverlay) : null,
    routeGeometry: isRecord(raw.routeGeometry)
      ? (raw.routeGeometry as unknown as RouteGeometry)
      : null,
    lensFilter: str(raw.lensFilter, ""),
    filterIntensity: num(raw.filterIntensity, DEFAULT_FILTER_INTENSITY),
    statData: {
      distance: num(statData.distance, DEFAULT_STAT_DATA.distance),
      distanceUnit: str(statData.distanceUnit, DEFAULT_STAT_DATA.distanceUnit),
      pace: str(statData.pace, DEFAULT_STAT_DATA.pace),
      time: str(statData.time, DEFAULT_STAT_DATA.time),
      title: str(statData.title, DEFAULT_STAT_DATA.title),
    },
  };
}

/**
 * Canonical form for comparison.
 *
 * Keys are emitted in a fixed order so two documents that differ only in
 * property insertion order still match, and `drawingCanvasDataUrl` is excluded
 * because the editor re-encodes the drawing canvas on every read — comparing
 * it would mark an untouched canvas dirty. Drawing edits are caught by
 * `hasDrawnStrokes` and by the history push that accompanies every stroke.
 */
export function docFingerprint(doc: EditorDoc): string {
  return JSON.stringify([
    doc.textOverlays,
    doc.stickerOverlays,
    doc.templateId,
    doc.statLayout,
    doc.capturedImage,
    [...doc.hiddenSlots].sort(),
    doc.committedCrop,
    doc.isBaseImageHidden,
    doc.isBaseImageLocked,
    doc.baseImageZIndex,
    doc.imagePerspectiveX,
    doc.imagePerspectiveY,
    doc.imageShadowBlur,
    doc.imageShadowOffsetY,
    doc.imageShadowColor,
    doc.isDrawingHidden,
    doc.isDrawingLocked,
    doc.drawingZIndex,
    doc.hasDrawnStrokes,
    doc.routeOverlay,
    doc.lensFilter,
    doc.filterIntensity,
    doc.statData,
  ]);
}

/** True when the canvas has changed since the reference document. */
export function isDocDirty(current: EditorDoc, saved: EditorDoc | null): boolean {
  if (!saved) return true;
  return docFingerprint(current) !== docFingerprint(saved);
}

export function newProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** The activity's own name, which is what the user recognises the project by. */
export function projectTitle(statData: StatData): string {
  const trimmed = statData.title?.trim();
  return trimmed ? trimmed : "Untitled";
}

/**
 * "Updated 10 mins ago" from a stored ISO timestamp.
 *
 * Projects store ISO so they can be sorted; the relative phrasing is a render
 * concern and is computed fresh, rather than frozen into the record the way
 * the old `updatedAt: "10 mins ago"` string was.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "recently";

  const seconds = Math.floor((now.getTime() - then) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "8.4 km" for a project card, or an em dash when there is no distance. */
export function formatDistance(statData: StatData): string {
  if (!statData.distance) return "—";
  return `${statData.distance} ${statData.distanceUnit}`;
}

/**
 * Share text built from the activity itself.
 *
 * The share sheet used to send a hardcoded "Check out my snap!", which is
 * off-brand and throws away every fact we hold. Empty parts are dropped rather
 * than shared as placeholder dashes.
 */
export function shareCaption(statData: StatData): string {
  const parts: string[] = [];

  if (statData.distance) parts.push(`${statData.distance} ${statData.distanceUnit}`);
  if (statData.pace && statData.pace !== "—") {
    parts.push(`${statData.pace}/${statData.distanceUnit}`);
  }
  if (statData.time && statData.time !== "—") parts.push(statData.time);

  const title = projectTitle(statData);
  if (parts.length === 0) return title;

  return `${parts.join(" · ")} — ${title}`;
}

/** A filesystem-safe filename stem for an export, from the activity name. */
export function exportFileStem(statData: StatData): string {
  const slug = projectTitle(statData)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "stride-export";
}

/**
 * Thumbnail dimensions for a crop ratio, capped at 320px on the *long* edge —
 * so every ratio costs about the same, rather than 4:5 quietly being 25%
 * taller than the cap. Small enough that a project costs ~40 KB rather than
 * the 2–4 MB a full-resolution export used to.
 */
export function thumbnailSize(ratio: string): { width: number; height: number } {
  const MAX = 320;
  switch (ratio) {
    case "1:1":
      return { width: MAX, height: MAX };
    case "4:5":
      return { width: Math.round(MAX * (4 / 5)), height: MAX };
    case "16:9":
      return { width: MAX, height: Math.round(MAX * (9 / 16)) };
    default:
      // 9:16 — the editor's default portrait canvas.
      return { width: Math.round(MAX * (9 / 16)), height: MAX };
  }
}
