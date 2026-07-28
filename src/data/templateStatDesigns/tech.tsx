import type { TemplateStatDesign } from "../../types";
import { FONT, fmt, roundRectPath } from "./shared";

/** Cyberpunk HUD load bar, shared by DOM and canvas. */
const HUD_FILL = 0.6;

export const TECH_DESIGNS: Record<string, TemplateStatDesign> = {
  terminal: {
    slots: {
      title: {
        text: () => "$ activity --export --format=card",
        fontFamily: FONT.mono,
        fontSize: 10,
        fontWeight: 400,
        color: "rgba(34,211,238,0.7)",
      },
      distance: {
        text: fmt.distPadded,
        suffix: fmt.unitUpper,
        suffixScale: 0.4,
        fontFamily: FONT.mono,
        fontSize: 30,
        fontWeight: 700,
        color: "#22D3EE",
        shadow: { color: "rgba(34,211,238,0.5)", blur: 20 },
      },
      pace: {
        text: (d) => `pace=${d.pace}`,
        fontFamily: FONT.mono,
        fontSize: 11,
        fontWeight: 400,
        color: "rgba(34,211,238,0.8)",
      },
      time: {
        text: (d) => `time=${d.time}`,
        fontFamily: FONT.mono,
        fontSize: 11,
        fontWeight: 400,
        color: "rgba(34,211,238,0.8)",
      },
    },
    defaultLayout: {
      title: { x: 6, y: 55 },
      distance: { x: 6, y: 58 },
      pace: { x: 6, y: 67 },
      time: { x: 28, y: 67 },
    },
  },

  digital: {
    slots: {
      title: {
        text: () => "Distance",
        fontFamily: FONT.mono,
        fontSize: 10,
        fontWeight: 400,
        color: "rgba(16,185,129,0.6)",
        uppercase: true,
        letterSpacing: 2,
      },
      distance: {
        text: fmt.distPadded,
        fontFamily: FONT.mono,
        fontSize: 36,
        fontWeight: 700,
        color: "#10B981",
        shadow: { color: "rgba(16,185,129,0.4)", blur: 15 },
        bg: { fill: "#0A1A0A", radius: 12, padX: 12, padY: 10, border: "rgba(16,185,129,0.3)" },
      },
      pace: {
        text: (d) => `${d.pace}/km`,
        fontFamily: FONT.mono,
        fontSize: 10,
        fontWeight: 400,
        color: "rgba(16,185,129,0.7)",
        bg: { fill: "#0A1A0A", radius: 4, padX: 8, padY: 2, border: "rgba(16,185,129,0.2)" },
      },
      time: {
        text: fmt.time,
        fontFamily: FONT.mono,
        fontSize: 10,
        fontWeight: 400,
        color: "rgba(16,185,129,0.7)",
        bg: { fill: "#0A1A0A", radius: 4, padX: 8, padY: 2, border: "rgba(16,185,129,0.2)" },
      },
    },
    defaultLayout: {
      title: { x: 6, y: 54 },
      distance: { x: 6, y: 57 },
      pace: { x: 6, y: 69 },
      time: { x: 26, y: 69 },
    },
  },

  cyberpunk: {
    slots: {
      title: {
        text: () => "[ HUD v2.4 ]",
        fontFamily: FONT.mono,
        fontSize: 9,
        fontWeight: 700,
        color: "#06B6D4",
        uppercase: true,
        letterSpacing: 2,
      },
      distance: {
        text: fmt.distPadded,
        suffix: fmt.unitUpper,
        suffixScale: 0.36,
        fontFamily: FONT.mono,
        fontSize: 36,
        fontWeight: 700,
        color: "#22D3EE",
        shadow: { color: "rgba(6,182,212,0.6)", blur: 30 },
      },
      pace: {
        text: (d) => `⚡ ${d.pace}`,
        fontFamily: FONT.mono,
        fontSize: 10,
        fontWeight: 400,
        color: "rgba(6,182,212,0.8)",
      },
      time: {
        text: (d) => `⏳ ${d.time}`,
        fontFamily: FONT.mono,
        fontSize: 10,
        fontWeight: 400,
        color: "rgba(6,182,212,0.8)",
      },
    },
    defaultLayout: {
      title: { x: 6, y: 53 },
      distance: { x: 6, y: 56 },
      pace: { x: 6, y: 66 },
      time: { x: 24, y: 66 },
      accent: { x: 6, y: 70 },
    },
    accentRender: () => (
      <div className="h-1 w-40 bg-[#06B6D4]/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#06B6D4] rounded-full"
          style={{ width: `${HUD_FILL * 100}%`, boxShadow: "0 0 10px #06B6D4" }}
        />
      </div>
    ),
    accentDraw: (ctx, box) => {
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

  route: {
    slots: {
      title: {
        text: (d) => `📍 ${d.title}`,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 700,
        color: "#60A5FA",
        uppercase: true,
        letterSpacing: 1,
      },
      distance: {
        text: fmt.dist2,
        suffix: fmt.unit,
        suffixScale: 0.47,
        suffixColor: "#60A5FA",
        fontFamily: FONT.display,
        fontSize: 30,
        fontWeight: 900,
        color: "#FFFFFF",
      },
      pace: {
        text: (d) => `⏱ ${d.pace}`,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 500,
        color: "#93C5FD",
      },
      time: {
        text: (d) => `🕐 ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 500,
        color: "#93C5FD",
      },
    },
    defaultLayout: {
      title: { x: 6, y: 55 },
      distance: { x: 6, y: 59 },
      pace: { x: 6, y: 68 },
      time: { x: 24, y: 68 },
    },
  },

  experimental: {
    slots: {
      title: {
        text: fmt.title,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 700,
        color: "rgba(244,114,182,0.7)",
        uppercase: true,
        letterSpacing: 2,
        rotation: -3,
      },
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.42,
        suffixColor: "#F472B6",
        fontFamily: FONT.display,
        fontSize: 48,
        fontWeight: 900,
        color: "#FFFFFF",
        rotation: -3,
      },
      pace: {
        text: fmt.pace,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 500,
        color: "rgba(244,114,182,0.7)",
        rotation: -3,
      },
      time: {
        text: fmt.time,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 500,
        color: "rgba(244,114,182,0.7)",
        rotation: -3,
      },
    },
    defaultLayout: {
      title: { x: 6, y: 54 },
      distance: { x: 6, y: 57 },
      pace: { x: 6, y: 68 },
      time: { x: 20, y: 68 },
    },
  },

  brutalist: {
    slots: {
      title: {
        text: fmt.title,
        fontFamily: FONT.display,
        fontSize: 9,
        fontWeight: 900,
        color: "rgba(255,255,255,0.7)",
        uppercase: true,
        letterSpacing: 2,
        bg: { fill: "#78716C", radius: 0, padX: 16, padY: 8 },
      },
      distance: {
        text: fmt.dist2,
        suffix: fmt.unit,
        suffixScale: 0.47,
        fontFamily: FONT.display,
        fontSize: 30,
        fontWeight: 900,
        color: "#FFFFFF",
        bg: { fill: "#78716C", radius: 0, padX: 16, padY: 8 },
        shadow: { color: "rgba(0,0,0,0.5)", blur: 0, x: 6, y: 6 },
      },
      pace: {
        text: fmt.pace,
        fontFamily: FONT.display,
        fontSize: 10,
        fontWeight: 900,
        color: "#000000",
        bg: { fill: "#FFFFFF", radius: 0, padX: 8, padY: 2 },
      },
      time: {
        text: fmt.time,
        fontFamily: FONT.display,
        fontSize: 10,
        fontWeight: 900,
        color: "#FFFFFF",
        bg: { fill: "#000000", radius: 0, padX: 8, padY: 2, border: "#FFFFFF" },
      },
    },
    defaultLayout: {
      title: { x: 6, y: 54 },
      distance: { x: 6, y: 58 },
      pace: { x: 6, y: 68 },
      time: { x: 20, y: 68 },
    },
  },
};
