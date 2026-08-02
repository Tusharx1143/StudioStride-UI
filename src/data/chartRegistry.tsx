/**
 * Registry of chart renderers keyed by a string discriminator.
 *
 * Mirrors the accent registry's contract — a DOM renderer and its canvas twin
 * held together so the preview and the export cannot drift — and adds an
 * availability predicate.
 *
 * `available` is what keeps chart slots honest. A treadmill run has no route;
 * a Health Connect walk has no splits. Without the predicate a template paints
 * an empty box over the user's photo. This is the same rule `StatData.metrics`
 * already follows: offer only what the activity actually carries.
 */

import type { ReactNode } from "react";
import type { ChartSlotId, ChartStyle, SlotBox, StatData, StatSlotId } from "../types";
import { routePointsInBox, splitBars, type ChartFit } from "../utils/chartGeometry";

export interface ChartEntry {
  /**
   * Furniture rather than data — draws from its own style alone, so
   * `available` is unconditionally true and it must never gate a template.
   */
  decorative?: boolean;
  /** Whether this chart can draw for this activity. */
  available: (d: StatData) => boolean;
  render: (d: StatData, style: ChartStyle) => ReactNode;
  draw: (
    ctx: CanvasRenderingContext2D,
    box: SlotBox,
    d: StatData,
    style: ChartStyle
  ) => void;
}

const CHART_SLOT_IDS: ChartSlotId[] = ["splits", "route", "ruleTop", "ruleBottom"];

export function isChartSlot(slot: StatSlotId): slot is ChartSlotId {
  return (CHART_SLOT_IDS as string[]).includes(slot);
}

/** Thinnest stroke that survives downscaling on a share image. */
const MIN_STROKE = 2;

/** How much wider the casing is than the stroke it sits under. */
const CASING_RATIO = 2.6;

const DEFAULT_CASING = "rgba(0,0,0,0.55)";

/** Bars beyond this are sampled away rather than crowding the box. */
const DEFAULT_MAX_BARS = 12;

function fitOf(style: ChartStyle): ChartFit {
  return style.options?.fit === "cover" ? "cover" : "contain";
}

function barCapOf(style: ChartStyle): number {
  const raw = Number(style.options?.maxBars ?? DEFAULT_MAX_BARS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_BARS;
}

export const CHART_REGISTRY: Record<string, ChartEntry> = {
  /**
   * The activity's GPS path, placed and stroked by the template.
   *
   * Options: `fit` ("contain" | "cover"), `casing` (boolean), `showStartDot`
   * (boolean), `showEndDot` (boolean).
   */
  route_trace: {
    available: (d) => Boolean(d.route && d.route.points.length >= 2),

    render: (d, style) => {
      if (!d.route || d.route.points.length < 2) return null;

      const points = routePointsInBox(d.route, style.width, style.height, fitOf(style));
      const path = points.map(([x, y]) => `${x},${y}`).join(" ");
      const stroke = style.strokeWidth ?? 3;
      const [startX, startY] = points[0];
      const [endX, endY] = points[points.length - 1];

      return (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${style.width} ${style.height}`}
          fill="none"
          style={{ opacity: style.opacity ?? 1, overflow: "visible" }}
        >
          {style.options?.casing === true ? (
            <polyline
              points={path}
              stroke={style.trackColor ?? DEFAULT_CASING}
              strokeWidth={stroke * CASING_RATIO}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          <polyline
            points={path}
            stroke={style.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {style.options?.showStartDot === true ? (
            <circle
              cx={startX}
              cy={startY}
              r={stroke * 1.6}
              fill={style.accentColor ?? style.color}
            />
          ) : null}
          {style.options?.showEndDot === true ? (
            <circle
              cx={endX}
              cy={endY}
              r={stroke * 1.6}
              fill={style.accentColor ?? style.color}
            />
          ) : null}
        </svg>
      );
    },

    draw: (ctx, box, d, style) => {
      if (!d.route || d.route.points.length < 2) return;

      const w = style.width * box.scale;
      const h = style.height * box.scale;
      const points = routePointsInBox(d.route, w, h, fitOf(style));
      const stroke = Math.max(MIN_STROKE, (style.strokeWidth ?? 3) * box.scale);

      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.globalAlpha = style.opacity ?? 1;
      // A GPS trace changes direction hundreds of times; mitre joins spike
      // into visible spurs at every switchback.
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const trace = () => {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.stroke();
      };

      if (style.options?.casing === true) {
        ctx.strokeStyle = style.trackColor ?? DEFAULT_CASING;
        ctx.lineWidth = stroke * CASING_RATIO;
        trace();
      }

      ctx.strokeStyle = style.color;
      ctx.lineWidth = stroke;
      trace();

      const dot = (px: number, py: number) => {
        ctx.beginPath();
        ctx.arc(px, py, stroke * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = style.accentColor ?? style.color;
        ctx.fill();
      };
      if (style.options?.showStartDot === true) dot(points[0][0], points[0][1]);
      if (style.options?.showEndDot === true) {
        dot(points[points.length - 1][0], points[points.length - 1][1]);
      }

      ctx.restore();
    },
  },

  /**
   * Per-kilometre pace bars, tallest for the fastest split.
   *
   * Options: `maxBars` (number, default 12), `highlightFastest` (boolean),
   * `radius` (number — corner rounding in reference px, DOM only).
   */
  splits_bars: {
    available: (d) => Boolean(d.splits && d.splits.length >= 2),

    render: (d, style) => {
      if (!d.splits || d.splits.length < 2) return null;

      const bars = splitBars(d.splits, style.width, style.height, barCapOf(style));
      const highlight = style.options?.highlightFastest === true;
      const radius = Number(style.options?.radius ?? 0);

      return (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${style.width} ${style.height}`}
          style={{ opacity: style.opacity ?? 1 }}
        >
          {bars.map((bar) => (
            <rect
              key={bar.index}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={radius || undefined}
              fill={
                highlight && bar.isFastest ? style.accentColor ?? style.color : style.color
              }
            />
          ))}
        </svg>
      );
    },

    draw: (ctx, box, d, style) => {
      if (!d.splits || d.splits.length < 2) return;

      const w = style.width * box.scale;
      const h = style.height * box.scale;
      const bars = splitBars(d.splits, w, h, barCapOf(style));
      const highlight = style.options?.highlightFastest === true;

      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.globalAlpha = style.opacity ?? 1;

      for (const bar of bars) {
        ctx.fillStyle =
          highlight && bar.isFastest ? style.accentColor ?? style.color : style.color;
        ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
      }

      ctx.restore();
    },
  },

  /**
   * A horizontal rule — the ticket perforation, the editorial hairline.
   *
   * The one entry that draws from nothing but its own style, so `available` is
   * unconditionally true and a template must never list it in `requires`.
   *
   * Options: `dash` (number, 0 = solid), `gap` (number, defaults to `dash`).
   */
  paper_rule: {
    decorative: true,
    available: () => true,

    render: (_d, style) => {
      const dash = Number(style.options?.dash ?? 0);
      const gap = Number(style.options?.gap ?? dash);
      const y = style.height / 2;

      return (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${style.width} ${style.height}`}
          style={{ opacity: style.opacity ?? 1, overflow: "visible" }}
        >
          <line
            x1={0}
            y1={y}
            x2={style.width}
            y2={y}
            stroke={style.color}
            strokeWidth={style.strokeWidth ?? 1}
            strokeDasharray={dash > 0 ? `${dash} ${gap}` : undefined}
          />
        </svg>
      );
    },

    draw: (ctx, box, _d, style) => {
      const w = style.width * box.scale;
      const y = (style.height / 2) * box.scale;
      const dash = Number(style.options?.dash ?? 0) * box.scale;
      const gap = Number(style.options?.gap ?? style.options?.dash ?? 0) * box.scale;

      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.globalAlpha = style.opacity ?? 1;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = Math.max(1, (style.strokeWidth ?? 1) * box.scale);
      ctx.setLineDash(dash > 0 ? [dash, gap] : []);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      // A dash pattern is context state, not path state — leaving it set would
      // dash every stroke drawn after this slot, including the route.
      ctx.setLineDash([]);
      ctx.restore();
    },
  },
};

/**
 * An unknown key resolves to null rather than throwing.
 *
 * Once templates are published from Firestore, a template may name a primitive
 * an older client has not shipped yet. That must skip the slot, not break the
 * whole render.
 */
export function getChartEntry(key: string): ChartEntry | null {
  return CHART_REGISTRY[key] ?? null;
}

/** Human-readable labels for the admin builder dropdown. */
export const CHART_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "None" },
  { value: "route_trace", label: "Route trace" },
  { value: "splits_bars", label: "Splits bars" },
  { value: "paper_rule", label: "Rule / perforation" },
];

/**
 * Which slots each primitive may be authored into, in preference order.
 *
 * The slot is the position anchor; the chart is what fills it. A rule has two
 * because a ticket needs one above the number and one below it.
 */
export const CHART_SLOTS_FOR: Record<string, ChartSlotId[]> = {
  route_trace: ["route"],
  splits_bars: ["splits"],
  paper_rule: ["ruleTop", "ruleBottom"],
};

/** True for slots that draw furniture, which must never appear in `requires`. */
export function isDecorativeSlot(slot: ChartSlotId): boolean {
  return slot === "ruleTop" || slot === "ruleBottom";
}

/** Default style for a chart the admin has just added, in reference px. */
export function defaultChartStyle(chart: string, accentColor: string): ChartStyle {
  if (chart === "splits_bars") {
    return {
      chart,
      width: 320,
      height: 56,
      color: "rgba(255,255,255,0.32)",
      accentColor,
      options: { maxBars: 12, highlightFastest: true },
    };
  }

  if (chart === "paper_rule") {
    return {
      chart,
      width: 320,
      height: 4,
      color: "rgba(255,255,255,0.35)",
      strokeWidth: 1,
      options: { dash: 5, gap: 4 },
    };
  }

  return {
    chart,
    width: 220,
    height: 220,
    color: accentColor,
    trackColor: "rgba(0,0,0,0.5)",
    strokeWidth: 2.5,
    options: { fit: "contain", casing: true },
  };
}
