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
