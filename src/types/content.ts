/**
 * Content-system types for the template/sticker/preset creation engine.
 *
 * All existing editor types live in `src/types.ts` — this file only adds the
 * Firestore-storable representations and admin-specific metadata.
 *
 * ── Runtime resolution ──
 * Functions (SlotStyle.text, accentRender, accentDraw) can't be stored in
 * Firestore. Instead admins pick from pre-built formatters/accent types and
 * the values are stored as string discriminators. At runtime the content
 * service resolves those strings back to actual functions via the registries
 * in `src/data/formatterRegistry.ts` and `src/data/accentRegistry.ts`.
 */

import type {
  ChartSlotId,
  ChartStyle,
  SlotBackground,
  SlotShadow,
  StatData,
  TemplateLayout,
  TextSlotId,
} from "../types";

// ====================================================================
// Content metadata (applied to every Firestore document)
// ====================================================================

export type ContentType =
  | "template_family"
  | "template_stat_design"
  | "lens_template"
  | "sticker"
  | "stock_photo"
  | "lens_filter"
  | "font"
  | "colorPalette";

export interface ContentMeta {
  /** Document ID (same as Firestore doc id). */
  id: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
  /** Soft-delete flag – inactive items are hidden from end users. */
  isActive: boolean;
  /** Firebase Auth UID of the creator. */
  createdBy: string;
}

// ====================================================================
// Firestore-storable Slots & Stat Designs
// ====================================================================

/**
 * Firestore-safe version of SlotStyle.
 * `text` and `suffix` are stored as string keys resolved at runtime
 * via `FORMATTER_REGISTRY`.
 */
export interface StorableSlotStyle {
  /** Name of the formatter, e.g. "dist2", "pace", "time", "title". */
  textFormatter: string;
  /** Optional suffix formatter, e.g. "unit", "unitUpper". */
  suffixFormatter?: string;
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

/**
 * Firestore-safe version of TemplateStatDesign.
 * accentRender/accentDraw are replaced by a string discriminator resolved
 * at runtime via `ACCENT_REGISTRY`.
 */
/**
 * Firestore-safe version of ChartStyle.
 *
 * Unlike slot styles and accents, this needs no resolution at all: `chart` is
 * already the CHART_REGISTRY key and every other field is a primitive,
 * SlotBackground or SlotShadow. It is stored and read back verbatim.
 */
export type StorableChartStyle = ChartStyle;

export interface StorableTemplateStatDesign {
  /** Links to a template family document. */
  templateFamilyId: string;
  /** Per-slot design, keyed by text-slot id. */
  slots: Partial<Record<TextSlotId, StorableSlotStyle>>;
  /** Chart slots this template draws, keyed by chart-slot id. */
  charts?: Partial<Record<ChartSlotId, StorableChartStyle>>;
  /** Chart slots without which the template is not offered to an activity. */
  requires?: ChartSlotId[];
  /** Default x/y positions for each active slot. */
  defaultLayout: TemplateLayout;
  /** Named accent style, e.g. "lap_bars" | "trophy" | "none". */
  accentType?: string;
}

// ====================================================================
// Firestore document shapes (stored per collection)
// ====================================================================

/** Firestore document for the `templateFamilies` collection. */
export interface FirestoreTemplateFamily extends ContentMeta {
  name: string;
  category: string;
  icon: string;
  tagline: string;
  accentColor: string;
}

/** Firestore document for the `templateStatDesigns` collection. */
export interface FirestoreTemplateStatDesign
  extends ContentMeta,
    StorableTemplateStatDesign {}

/**
 * Firestore document for the `lensTemplates` collection.
 * defaultElements is already serializable (no functions) so it maps 1:1
 * to the existing LensTemplate type's defaultElements.
 */
export interface FirestoreLensTemplate extends ContentMeta {
  name: string;
  category: string;
  icon: string;
  tagline: string;
  badgeColor: string;
  overlayType: string;
  defaultElements: import("../types").EditableLensElement[];
}

/** Firestore document for the `stickers` collection. */
export interface FirestoreSticker extends ContentMeta {
  /** Display text inside the badge. */
  content: string;
  /** Human-readable label. */
  label: string;
  /** Category group e.g. "Badges", "Stats", "Locations". */
  category: string;
  /** Type discriminator: "emoji" | "badge" | "metric" | "location". */
  type: string;
  /** Tailwind gradient classes e.g. "from-amber-500 to-yellow-400". */
  bgGradient?: string;
  /** Optional stat key for dynamic metric stickers. */
  statKey?: string;
  /**
   * Format template for dynamic stickers. Interpolates:
   *  {value}  — the raw stat value
   *  {label}  — human-readable stat label
   *  {unit}   — measurement unit
   * Example: "❤️ {value} bpm" → "❤️ 154 bpm"
   * When absent, `content` is used as-is.
   */
  format?: string;
  /** When true, render without background — just text/emoji over the photo. */
  transparent?: boolean;
}

/** Firestore document for the `stockPhotos` collection. */
export interface FirestoreStockPhoto extends ContentMeta {
  name: string;
  category: string;
  /** Firebase Storage path (not download URL — resolved at runtime). */
  storagePath: string;
  thumbnailStoragePath?: string;
}

/** Firestore document for the `lensFilters` collection. */
export interface FirestoreLensFilter extends ContentMeta {
  name: string;
  overlayType: string;
  /** CSS filter string, e.g. "contrast(1.15) saturate(1.3)". */
  filterCSS: string;
}

/** Firestore document for the `fonts` collection. */
export interface FirestoreFont extends ContentMeta {
  name: string;
  /** CSS font-family value, e.g. "'Inter', sans-serif" */
  fontFamily: string;
  /** Category for grouping: "sans-serif" | "serif" | "display" | "handwriting" | "monospace" */
  category: string;
  /** Available font weights, e.g. ["300","400","600","700","800","900"] */
  weights: string[];
  /** Google Fonts CSS URL to load this font */
  googleFontUrl?: string;
  /** Fallback stack, e.g. "sans-serif" */
  fallback: string;
}

/** Firestore document for the `colorPalettes` collection. */
export interface FirestoreColorPalette extends ContentMeta {
  name: string;
  /** Array of hex color values */
  colors: string[];
  /** Category e.g. "Neon", "Earth", "Ocean", "Brand" */
  category: string;
}

// ====================================================================
// Admin form input types (used by builder components)
// ====================================================================

export interface TemplateFamilyFormData {
  name: string;
  category: string;
  icon: string;
  tagline: string;
  accentColor: string;
}

export interface StatDesignFormData {
  templateFamilyId: string;
  slots: Partial<Record<TextSlotId, StorableSlotStyle>>;
  defaultLayout: TemplateLayout;
  accentType: string;
}

export interface LensTemplateFormData {
  name: string;
  category: string;
  icon: string;
  tagline: string;
  badgeColor: string;
  overlayType: string;
  defaultElements: import("../types").EditableLensElement[];
}

export interface StickerFormData {
  content: string;
  label: string;
  category: string;
  type: string;
  bgGradient?: string;
  statKey?: string;
  format?: string;
  transparent?: boolean;
}

export interface StockPhotoFormData {
  name: string;
  category: string;
  /**
   * Direct URL to the image. Stock photos are hosted externally (Unsplash and
   * friends) rather than uploaded — see `storagePath` on FirestoreStockPhoto,
   * which holds this same URL.
   */
  url: string;
}

export interface LensFilterFormData {
  name: string;
  overlayType: string;
  filterCSS: string;
}

export interface FontFormData {
  name: string;
  fontFamily: string;
  category: string;
  weights: string[];
  googleFontUrl?: string;
  fallback: string;
}

export interface ColorPaletteFormData {
  name: string;
  colors: string[];
  category: string;
}

/**
 * A sticker item as stored in the stickers collection and consumed by the editor.
 * Mirrors the shape used in STICKER_LIBRARY within EditorScreen.
 */
export interface StickerItem {
  id: string;
  content: string;
  label: string;
  category: string;
  type: "emoji" | "badge" | "metric" | "location";
  bgGradient?: string;
  statKey?: string;
  /** Format template for dynamic stickers (see FirestoreSticker.format). */
  format?: string;
  /** When true, render without background — just text/emoji over the photo. */
  transparent?: boolean;
}

/** Runtime content bundle — what ContentContext exposes. */
export interface ContentBundle {
  templateFamilies: import("../types").TemplateFamily[];
  statDesigns: Record<string, import("../types").TemplateStatDesign>;
  lensTemplates: import("../types").LensTemplate[];
  stickers: StickerItem[];
  stockPhotos: import("../types").PhotoSource[];
  lensFilters: Record<string, string>;
  fonts: FirestoreFont[];
  colorPalettes: FirestoreColorPalette[];
}
