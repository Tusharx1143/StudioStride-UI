/**
 * Registry of accent renderers keyed by discrimination strings.
 *
 * Admins pick an accent type from a dropdown in the Stat Design builder.
 * At runtime the content service resolves the string to the matching
 * { render, draw } pair.
 *
 * Each entry must provide both a DOM render function (`accentRender`)
 * and a Canvas draw function (`accentDraw`) so exports match the preview.
 *
 * Extract these from the design modules into this file so the originals
 * can re-export from here.
 */

import type { ReactNode } from "react";
import type { SlotBox, StatData } from "../types";
import { FONT, roundRectPath } from "./templateStatDesigns/shared";

// ---------------------------------------------------------------------------
// Shared constants extracted from their respective modules
// ---------------------------------------------------------------------------

const LAP_BARS = [0.18, 0.36, 0.54, 0.72, 0.9];
const FILM_TICKS = [0.2, 0.4, 0.3, 0.5];
const RINGS: Array<[number, string, number, number]> = [
  [24, "#FF4D3D", 151, 30],
  [18, "#34D399", 113, 20],
  [12, "#60A5FA", 75, 10],
];
const WEEK_BARS = [0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.6];
const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_PROGRESS = 0.78;
const HUD_FILL = 0.6;

// ---------------------------------------------------------------------------
// Accent entries
// ---------------------------------------------------------------------------

export interface AccentEntry {
  render: (d: StatData) => ReactNode;
  draw: (ctx: CanvasRenderingContext2D, box: SlotBox, d: StatData) => void;
}

/**
 * Every accent type the admin builder can assign to a template stat design.
 * The key is the value stored in Firestore as `accentType`.
 */
export const ACCENT_REGISTRY: Record<string, AccentEntry> = {
  /** Hero lap bars (bold.tsx). */
  lap_bars: {
    render: () => (
      <div className="flex gap-3">
        {LAP_BARS.map((h, i) => (
          <div
            key={i}
            className="w-3 bg-white/20 rounded-sm"
            style={{ height: `${h * 100}%`, minHeight: 4 }}
          />
        ))}
      </div>
    ),
    draw: (ctx, box) => {
      const s = box.scale;
      const gap = 12 * s;
      const w = 12 * s;
      LAP_BARS.forEach((h, i) => {
        const barH = h * 40 * s;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(box.x + i * (w + gap), box.y + 40 * s - barH, w, barH);
      });
    },
  },

  /** Quote marks (clean.tsx — quote template). */
  quote: {
    render: () => (
      <div
        className="text-4xl text-[#A78BFA] leading-none"
        style={{ fontFamily: FONT.serif }}
      >
        &quot;
      </div>
    ),
    draw: (ctx, box) => {
      ctx.font = `700 ${36 * box.scale}px ${FONT.serif}`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "#A78BFA";
      ctx.fillText('"', box.x, box.y);
    },
  },

  /** Weekly bar chart (clean.tsx — weekly template). */
  weekly_bars: {
    render: () => (
      <div className="flex gap-3 w-48">
        {WEEK_BARS.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-white/10 rounded-full h-10 relative overflow-hidden">
              <div
                className="absolute bottom-0 w-full rounded-full bg-[#34D399]"
                style={{ height: `${h * 100}%` }}
              />
            </div>
            <span className="text-[8px] text-white/40">{WEEK_DAYS[i]}</span>
          </div>
        ))}
      </div>
    ),
    draw: (ctx, box) => {
      const s = box.scale;
      const total = 192 * s;
      const gap = 12 * s;
      const w = (total - gap * (WEEK_BARS.length - 1)) / WEEK_BARS.length;
      const trackH = 40 * s;
      WEEK_BARS.forEach((h, i) => {
        const x = box.x + i * (w + gap);
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        roundRectPath(ctx, x, box.y, w, trackH, w / 2);
        ctx.fill();
        const fillH = trackH * h;
        ctx.fillStyle = "#34D399";
        roundRectPath(ctx, x, box.y + trackH - fillH, w, fillH, w / 2);
        ctx.fill();
        ctx.font = `${8 * s}px ${FONT.ui}`;
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textBaseline = "top";
        ctx.textAlign = "center";
        ctx.fillText(WEEK_DAYS[i], x + w / 2, box.y + trackH + 4 * s);
      });
      ctx.textAlign = "left";
    },
  },

  /** Monthly progress bar (clean.tsx — monthly template). */
  monthly_progress: {
    render: () => (
      <div className="h-1.5 w-44 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#34D399]"
          style={{ width: `${MONTH_PROGRESS * 100}%` }}
        />
      </div>
    ),
    draw: (ctx, box) => {
      const w = 176 * box.scale;
      const h = 6 * box.scale;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      roundRectPath(ctx, box.x, box.y, w, h, h / 2);
      ctx.fill();
      const gradient = ctx.createLinearGradient(box.x, box.y, box.x + w, box.y);
      gradient.addColorStop(0, "#60A5FA");
      gradient.addColorStop(1, "#34D399");
      ctx.fillStyle = gradient;
      roundRectPath(ctx, box.x, box.y, w * MONTH_PROGRESS, h, h / 2);
      ctx.fill();
    },
  },

  /** Vintage film ticks (classic.tsx — vintage template). */
  film_ticks: {
    render: () => (
      <div className="flex gap-1 w-24">
        {FILM_TICKS.map((opacity, i) => (
          <div
            key={i}
            className="h-0.5 flex-1 rounded-full bg-amber-200/50"
            style={{ opacity }}
          />
        ))}
      </div>
    ),
    draw: (ctx, box) => {
      const total = 96 * box.scale;
      const gap = 4 * box.scale;
      const w = (total - gap * (FILM_TICKS.length - 1)) / FILM_TICKS.length;
      const h = 2 * box.scale;
      FILM_TICKS.forEach((opacity, i) => {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = "rgba(253,230,138,0.5)";
        roundRectPath(ctx, box.x + i * (w + gap), box.y, w, h, h / 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    },
  },

  /** Apple activity rings (classic.tsx — apple template). */
  apple_rings: {
    render: () => (
      <svg width="56" height="56" viewBox="0 0 56 56" className="drop-shadow-lg">
        {RINGS.map(([r, color, dash, offset]) => (
          <circle
            key={r}
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={dash}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        ))}
      </svg>
    ),
    draw: (ctx, box) => {
      const s = box.scale;
      const cx = box.x + 28 * s;
      const cy = box.y + 28 * s;
      ctx.lineCap = "round";
      ctx.lineWidth = 5 * s;
      RINGS.forEach(([r, color, dash, offset]) => {
        const radius = r * s;
        const circumference = 2 * Math.PI * radius;
        const drawn = Math.max(0, ((dash - offset) / dash) * circumference);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          radius,
          -Math.PI / 2,
          -Math.PI / 2 + drawn / radius
        );
        ctx.stroke();
      });
      ctx.lineCap = "butt";
    },
  },

  /** Cyberpunk HUD load bar (tech.tsx — cyberpunk template). */
  hud_load_bar: {
    render: () => (
      <div className="h-1 w-40 bg-[#06B6D4]/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#06B6D4] rounded-full"
          style={{ width: `${HUD_FILL * 100}%`, boxShadow: "0 0 10px #06B6D4" }}
        />
      </div>
    ),
    draw: (ctx, box) => {
      const w = 160 * box.scale;
      const h = 4 * box.scale;
      ctx.fillStyle = "rgba(6,182,212,0.2)";
      roundRectPath(ctx, box.x, box.y, w, h, h / 2);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = "#06B6D4";
      ctx.shadowBlur = 10 * box.scale;
      ctx.fillStyle = "#06B6D4";
      roundRectPath(ctx, box.x, box.y, w * HUD_FILL, h, h / 2);
      ctx.fill();
      ctx.restore();
    },
  },
};

/** Human-readable labels for the admin builder dropdown. */
export const ACCENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "None" },
  { value: "lap_bars", label: "Lap bars" },
  { value: "quote", label: "Quote mark" },
  { value: "weekly_bars", label: "Weekly bar chart" },
  { value: "monthly_progress", label: "Monthly progress bar" },
  { value: "film_ticks", label: "Film ticks (vintage)" },
  { value: "apple_rings", label: "Apple activity rings" },
  { value: "hud_load_bar", label: "HUD load bar (cyberpunk)" },
];
