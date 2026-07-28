import type { StatData } from "../../types";

/** Only fonts the app actually loads (see index.html) plus system stacks. */
export const FONT = {
  display: "'Archivo', sans-serif",
  ui: "'Inter', sans-serif",
  serif: "'Playfair Display', serif",
  mono: "'Courier New', monospace",
} as const;

export const VOLT = "#F4E409";

/** Text formatters shared across template entries. */
export const fmt = {
  dist1: (d: StatData) => d.distance.toFixed(1),
  dist2: (d: StatData) => d.distance.toFixed(2),
  distPadded: (d: StatData) => d.distance.toFixed(2).padStart(5, "0"),
  unit: (d: StatData) => d.distanceUnit,
  unitUpper: (d: StatData) => d.distanceUnit.toUpperCase(),
  pace: (d: StatData) => d.pace,
  time: (d: StatData) => d.time,
  title: (d: StatData) => d.title,
  dateShort: () =>
    new Date()
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      .toUpperCase(),
  weekday: () =>
    new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
};

/** Weekly bar heights — fixed so the DOM render and the canvas export agree. */
export const WEEK_BARS = [0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.6];
export const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Monthly goal completion, mirrored by accentRender and accentDraw. */
export const MONTH_PROGRESS = 0.78;

/** Rounded rectangle that works whether or not roundRect is available. */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
