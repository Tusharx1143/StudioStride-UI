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
