import type { TemplateStatDesign } from "../../types";
import { FONT, VOLT, fmt, roundRectPath } from "./shared";

/** Lap-bar fill ratios, shared by the DOM render and the canvas export. */
const LAP_BARS = [0.18, 0.36, 0.54, 0.72, 0.9];

export const BOLD_DESIGNS: Record<string, TemplateStatDesign> = {
  hero: {
    slots: {
      distance: {
        text: fmt.dist2,
        suffix: fmt.unit,
        suffixScale: 0.33,
        suffixColor: VOLT,
        fontFamily: FONT.display,
        fontSize: 60,
        fontWeight: 900,
        color: "#FFFFFF",
        letterSpacing: -2,
        shadow: { color: "rgba(0,0,0,0.55)", blur: 18, y: 4 },
      },
      title: {
        text: fmt.title,
        fontFamily: FONT.ui,
        fontSize: 12,
        fontWeight: 600,
        color: "rgba(255,255,255,0.6)",
        uppercase: true,
        letterSpacing: 2,
      },
    },
    defaultLayout: {
      distance: { x: 6, y: 56 },
      title: { x: 6, y: 66 },
    },
  },

  sports: {
    slots: {
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.45,
        fontFamily: FONT.display,
        fontSize: 30,
        fontWeight: 900,
        color: "#FFFFFF",
        letterSpacing: -1,
        bg: { fill: "#FF4D3D", radius: 8, padX: 16, padY: 8 },
        shadow: { color: "rgba(0,0,0,0.45)", blur: 16, y: 6 },
      },
      pace: {
        text: fmt.pace,
        fontFamily: FONT.display,
        fontSize: 12,
        fontWeight: 900,
        color: "#FFFFFF",
        uppercase: true,
        letterSpacing: 1,
        bg: { fill: "rgba(0,0,0,0.7)", radius: 4, padX: 8, padY: 4 },
      },
      time: {
        text: fmt.time,
        fontFamily: FONT.display,
        fontSize: 12,
        fontWeight: 900,
        color: "#FFFFFF",
        uppercase: true,
        letterSpacing: 1,
        bg: { fill: "rgba(0,0,0,0.7)", radius: 4, padX: 8, padY: 4 },
      },
    },
    defaultLayout: {
      distance: { x: 6, y: 56 },
      pace: { x: 6, y: 67 },
      time: { x: 26, y: 67 },
    },
  },

  race: {
    slots: {
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.37,
        suffixColor: "#EF4444",
        fontFamily: FONT.display,
        fontSize: 48,
        fontWeight: 900,
        color: "#FFFFFF",
        italic: true,
        letterSpacing: -2,
      },
      pace: {
        text: (d) => `#${d.pace}`,
        fontFamily: FONT.display,
        fontSize: 12,
        fontWeight: 900,
        color: "#FFFFFF",
        bg: { fill: "#EF4444", radius: 4, padX: 8, padY: 2 },
      },
      time: {
        text: (d) => `LAP TIME ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 12,
        fontWeight: 700,
        color: "rgba(255,255,255,0.7)",
      },
    },
    defaultLayout: {
      distance: { x: 6, y: 55 },
      pace: { x: 6, y: 65 },
      time: { x: 22, y: 65 },
      accent: { x: 6, y: 70 },
    },
    accentRender: () => (
      <div className="flex gap-1">
        {LAP_BARS.map((fill, i) => (
          <div key={i} className="w-6 h-1 rounded-full bg-white/20">
            <div className="h-full rounded-full bg-[#EF4444]" style={{ width: `${fill * 100}%` }} />
          </div>
        ))}
      </div>
    ),
    accentDraw: (ctx, box) => {
      const w = 24 * box.scale;
      const h = 4 * box.scale;
      const gap = 4 * box.scale;
      LAP_BARS.forEach((fill, i) => {
        const x = box.x + i * (w + gap);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        roundRectPath(ctx, x, box.y, w, h, h / 2);
        ctx.fill();
        ctx.fillStyle = "#EF4444";
        roundRectPath(ctx, x, box.y, w * fill, h, h / 2);
        ctx.fill();
      });
    },
  },

  motion: {
    slots: {
      distance: {
        text: fmt.dist2,
        fontFamily: FONT.display,
        fontSize: 48,
        fontWeight: 900,
        color: VOLT,
        italic: true,
        letterSpacing: -2,
        shadow: { color: "rgba(244,228,9,0.6)", blur: 30 },
      },
      pace: {
        text: fmt.pace,
        fontFamily: FONT.ui,
        fontSize: 12,
        fontWeight: 700,
        color: "rgba(244,228,9,0.7)",
      },
      time: {
        text: fmt.time,
        fontFamily: FONT.ui,
        fontSize: 12,
        fontWeight: 700,
        color: "rgba(244,228,9,0.7)",
      },
      title: {
        text: fmt.unit,
        fontFamily: FONT.ui,
        fontSize: 12,
        fontWeight: 700,
        color: "rgba(244,228,9,0.7)",
      },
    },
    defaultLayout: {
      distance: { x: 6, y: 57 },
      title: { x: 6, y: 67 },
      pace: { x: 16, y: 67 },
      time: { x: 30, y: 67 },
    },
  },

  achievement: {
    slots: {
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.6,
        fontFamily: FONT.display,
        fontSize: 30,
        fontWeight: 900,
        color: "#0B0B0B",
        bg: { fill: "#FBBF24", radius: 12, padX: 20, padY: 10 },
        shadow: { color: "rgba(0,0,0,0.4)", blur: 18, y: 6 },
      },
      title: {
        text: () => "Achievement Unlocked",
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 800,
        color: "rgba(255,255,255,0.75)",
        uppercase: true,
        letterSpacing: 2,
      },
      time: {
        text: (d) => `${d.title} · ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.7)",
      },
    },
    defaultLayout: {
      accent: { x: 8, y: 48 },
      title: { x: 8, y: 55 },
      distance: { x: 8, y: 58 },
      time: { x: 8, y: 68 },
    },
    accentRender: () => <div className="text-3xl">🏆</div>,
    accentDraw: (ctx, box) => {
      ctx.font = `${30 * box.scale}px ${FONT.ui}`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("🏆", box.x, box.y);
    },
  },
};
