import type { TemplateStatDesign } from "../../types";
import {
  FONT,
  MONTH_PROGRESS,
  VOLT,
  WEEK_BARS,
  WEEK_DAYS,
  fmt,
  roundRectPath,
} from "./shared";

export const CLEAN_DESIGNS: Record<string, TemplateStatDesign> = {
  minimal: {
    slots: {
      distance: {
        text: fmt.dist2,
        suffix: fmt.unit,
        suffixScale: 0.375,
        suffixColor: VOLT,
        fontFamily: FONT.display,
        fontSize: 48,
        fontWeight: 900,
        color: "#FFFFFF",
        letterSpacing: -2,
        shadow: { color: "rgba(0,0,0,0.5)", blur: 14, y: 3 },
      },
      pace: {
        text: (d) => `Pace ${d.pace}`,
        fontFamily: FONT.ui,
        fontSize: 12,
        fontWeight: 600,
        color: "#FFFFFF",
        bg: {
          fill: "rgba(0,0,0,0.6)",
          radius: 12,
          padX: 12,
          padY: 6,
          border: "rgba(255,255,255,0.1)",
          blur: true,
        },
      },
      time: {
        text: (d) => `Time ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 12,
        fontWeight: 600,
        color: "#FFFFFF",
        bg: {
          fill: "rgba(0,0,0,0.6)",
          radius: 12,
          padX: 12,
          padY: 6,
          border: "rgba(255,255,255,0.1)",
          blur: true,
        },
      },
    },
    defaultLayout: {
      distance: { x: 6, y: 57 },
      pace: { x: 6, y: 68 },
      time: { x: 32, y: 68 },
    },
  },

  modern: {
    slots: {
      distance: {
        text: fmt.dist2,
        suffix: fmt.unit,
        suffixScale: 0.35,
        suffixColor: "rgba(255,255,255,0.4)",
        fontFamily: FONT.display,
        fontSize: 36,
        fontWeight: 900,
        color: "#FFFFFF",
        letterSpacing: -1,
      },
      pace: {
        text: (d) => `Pace  ${d.pace}`,
        fontFamily: FONT.ui,
        fontSize: 11,
        fontWeight: 700,
        color: "#FFFFFF",
      },
      time: {
        text: (d) => `Time  ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 11,
        fontWeight: 700,
        color: "#FFFFFF",
      },
    },
    defaultLayout: {
      distance: { x: 6, y: 57 },
      pace: { x: 6, y: 67 },
      time: { x: 32, y: 67 },
    },
  },

  quote: {
    slots: {
      distance: {
        text: (d) => `${d.distance.toFixed(1)} kilometers of pure momentum`,
        fontFamily: FONT.serif,
        fontSize: 20,
        fontWeight: 500,
        color: "#FFFFFF",
        italic: true,
      },
      title: {
        text: (d) => `— ${d.title} · ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 700,
        color: "#A78BFA",
        uppercase: true,
        letterSpacing: 1,
      },
    },
    defaultLayout: {
      accent: { x: 6, y: 50 },
      distance: { x: 6, y: 56 },
      title: { x: 6, y: 70 },
    },
    accentRender: () => (
      <div
        className="text-4xl text-[#A78BFA] leading-none"
        style={{ fontFamily: FONT.serif }}
      >
        &quot;
      </div>
    ),
    accentDraw: (ctx, box) => {
      ctx.font = `700 ${36 * box.scale}px ${FONT.serif}`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "#A78BFA";
      ctx.fillText('"', box.x, box.y);
    },
  },

  calendar: {
    slots: {
      title: {
        text: fmt.weekday,
        fontFamily: FONT.display,
        fontSize: 10,
        fontWeight: 900,
        color: "#FB923C",
        uppercase: true,
        letterSpacing: 2,
      },
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.47,
        suffixColor: "#FB923C",
        fontFamily: FONT.display,
        fontSize: 30,
        fontWeight: 900,
        color: "#FFFFFF",
      },
      pace: {
        text: fmt.pace,
        fontFamily: FONT.ui,
        fontSize: 11,
        fontWeight: 600,
        color: "rgba(255,255,255,0.7)",
      },
      time: {
        text: fmt.time,
        fontFamily: FONT.ui,
        fontSize: 11,
        fontWeight: 600,
        color: "rgba(255,255,255,0.7)",
      },
    },
    defaultLayout: {
      title: { x: 6, y: 56 },
      distance: { x: 6, y: 60 },
      pace: { x: 6, y: 69 },
      time: { x: 22, y: 69 },
    },
  },

  weekly: {
    slots: {
      title: {
        text: () => "This Week",
        fontFamily: FONT.display,
        fontSize: 10,
        fontWeight: 900,
        color: "#34D399",
        uppercase: true,
        letterSpacing: 2,
      },
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.47,
        suffixColor: "#34D399",
        fontFamily: FONT.display,
        fontSize: 30,
        fontWeight: 900,
        color: "#FFFFFF",
      },
    },
    defaultLayout: {
      title: { x: 6, y: 52 },
      distance: { x: 6, y: 56 },
      accent: { x: 6, y: 65 },
    },
    accentRender: () => (
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
    accentDraw: (ctx, box) => {
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

  monthly: {
    slots: {
      title: {
        text: () => "Monthly Progress",
        fontFamily: FONT.display,
        fontSize: 9,
        fontWeight: 900,
        color: "#60A5FA",
        uppercase: true,
        letterSpacing: 2,
      },
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.35,
        suffixColor: "#60A5FA",
        fontFamily: FONT.display,
        fontSize: 36,
        fontWeight: 900,
        color: "#FFFFFF",
      },
      pace: {
        text: () => `${Math.round(MONTH_PROGRESS * 100)}% of monthly goal`,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 500,
        color: "rgba(255,255,255,0.5)",
      },
    },
    defaultLayout: {
      title: { x: 6, y: 54 },
      distance: { x: 6, y: 57 },
      accent: { x: 6, y: 67 },
      pace: { x: 6, y: 70 },
    },
    accentRender: () => (
      <div className="h-1.5 w-44 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#34D399]"
          style={{ width: `${MONTH_PROGRESS * 100}%` }}
        />
      </div>
    ),
    accentDraw: (ctx, box) => {
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
};
