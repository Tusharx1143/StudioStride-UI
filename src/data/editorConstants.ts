/**
 * Editor constants extracted from EditorScreen.tsx to reduce bloat
 * and allow reuse across the admin builders.
 */

// ---------------------------------------------------------------------------
// Font Styles
// ---------------------------------------------------------------------------

export type FontStyleId = "Classic" | "Modern" | "Bold" | "Neon" | "Serif" | "Typewriter";

export interface FontStyleEntry {
  id: FontStyleId;
  label: string;
  className: string;
}

export const FONT_STYLES: FontStyleEntry[] = [
  { id: "Classic", label: "Classic", className: "font-sans font-semibold tracking-normal" },
  { id: "Modern", label: "Modern", className: "font-mono tracking-wider text-transform uppercase" },
  { id: "Bold", label: "Bold", className: "font-black tracking-tighter uppercase font-display" },
  { id: "Neon", label: "Neon", className: "font-sans font-extrabold tracking-wide drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" },
  { id: "Serif", label: "Serif", className: "font-serif italic font-medium" },
  { id: "Typewriter", label: "Typewriter", className: "font-mono font-medium tracking-tight" },
];

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

export interface ColorEntry {
  hex: string;
  name: string;
}

export const COLOR_PALETTE: ColorEntry[] = [
  { hex: "#FFFFFF", name: "White" },
  { hex: "#F4E409", name: "Yellow" },
  { hex: "#FF2A6D", name: "Hot Pink" },
  { hex: "#05D9E8", name: "Cyan" },
  { hex: "#FF7A1A", name: "Ember" },
  { hex: "#2EC4B6", name: "Mint" },
  { hex: "#9B5DE5", name: "Purple" },
  { hex: "#FF4D3D", name: "Red" },
  { hex: "#000000", name: "Black" },
];

// ---------------------------------------------------------------------------
// Background Styles
// ---------------------------------------------------------------------------

export type BgStyleId = "none" | "solid" | "semi" | "outline";

export interface BgStyleEntry {
  id: BgStyleId;
  label: string;
}

export const BG_STYLES: BgStyleEntry[] = [
  { id: "none", label: "Transparent" },
  { id: "solid", label: "Solid" },
  { id: "semi", label: "Translucent" },
  { id: "outline", label: "Outline" },
];
