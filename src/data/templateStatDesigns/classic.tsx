import type { TemplateStatDesign } from "../../types";
import { FONT, fmt, roundRectPath } from "./shared";

/** Vintage film-strip tick opacities, shared by DOM and canvas. */
const FILM_TICKS = [0.2, 0.4, 0.3, 0.5];

/** Apple ring geometry: [radius, color, dash length, dash offset]. */
const RINGS: Array<[number, string, number, number]> = [
  [24, "#FF4D3D", 151, 30],
  [18, "#34D399", 113, 20],
  [12, "#60A5FA", 75, 10],
];

export const CLASSIC_DESIGNS: Record<string, TemplateStatDesign> = {
  editorial: {
    slots: {
      title: {
        text: fmt.title,
        fontFamily: FONT.serif,
        fontSize: 36,
        fontWeight: 700,
        color: "#FFFFFF",
        italic: true,
      },
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.8,
        suffixColor: "rgba(255,255,255,0.5)",
        fontFamily: FONT.ui,
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
      },
      pace: {
        text: fmt.pace,
        fontFamily: FONT.ui,
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
      },
      time: {
        text: fmt.time,
        fontFamily: FONT.ui,
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
      },
    },
    defaultLayout: {
      title: { x: 6, y: 56 },
      distance: { x: 6, y: 67 },
      pace: { x: 26, y: 67 },
      time: { x: 44, y: 67 },
    },
  },

  magazine: {
    slots: {
      title: {
        text: fmt.title,
        fontFamily: FONT.display,
        fontSize: 9,
        fontWeight: 900,
        color: "#EC4899",
        uppercase: true,
        letterSpacing: 3,
      },
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.4,
        suffixColor: "#EC4899",
        fontFamily: FONT.serif,
        fontSize: 48,
        fontWeight: 700,
        color: "#FFFFFF",
        italic: true,
      },
      pace: {
        text: (d) => `${d.pace} / ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 700,
        color: "rgba(255,255,255,0.6)",
        uppercase: true,
        letterSpacing: 1,
      },
    },
    defaultLayout: {
      title: { x: 6, y: 54 },
      distance: { x: 6, y: 57 },
      pace: { x: 6, y: 68 },
    },
  },

  polaroid: {
    slots: {
      title: {
        text: fmt.dateShort,
        fontFamily: FONT.ui,
        fontSize: 9,
        fontWeight: 600,
        color: "#71717A",
        bg: { fill: "#F5F0E8", radius: 2, padX: 12, padY: 6 },
      },
      distance: {
        text: fmt.dist1,
        suffix: () => "km",
        suffixScale: 0.7,
        fontFamily: FONT.serif,
        fontSize: 24,
        fontWeight: 700,
        color: "#27272A",
        bg: { fill: "#F5F0E8", radius: 2, padX: 12, padY: 6 },
        shadow: { color: "rgba(0,0,0,0.4)", blur: 20, x: 4, y: 6 },
      },
      pace: {
        text: (d) => `${d.pace} · ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 500,
        color: "#71717A",
        bg: { fill: "#F5F0E8", radius: 2, padX: 12, padY: 6 },
      },
    },
    defaultLayout: {
      title: { x: 8, y: 54 },
      distance: { x: 8, y: 59 },
      pace: { x: 8, y: 68 },
    },
  },

  vintage: {
    slots: {
      title: {
        text: fmt.dateShort,
        fontFamily: FONT.ui,
        fontSize: 9,
        fontWeight: 500,
        color: "#71717A",
        letterSpacing: 1,
        bg: { fill: "rgba(255,251,235,0.95)", radius: 8, padX: 12, padY: 6 },
      },
      distance: {
        text: (d) => `${d.distance.toFixed(1)} kilometers`,
        fontFamily: FONT.serif,
        fontSize: 24,
        fontWeight: 700,
        color: "#18181B",
        bg: { fill: "rgba(255,251,235,0.95)", radius: 8, padX: 12, padY: 6 },
        shadow: { color: "rgba(0,0,0,0.35)", blur: 16, y: 4 },
      },
      pace: {
        text: (d) => `${d.pace} · ${d.time}`,
        fontFamily: FONT.serif,
        fontSize: 10,
        fontWeight: 400,
        color: "#71717A",
        italic: true,
        bg: { fill: "rgba(255,251,235,0.95)", radius: 8, padX: 12, padY: 6 },
      },
    },
    defaultLayout: {
      title: { x: 7, y: 53 },
      distance: { x: 7, y: 58 },
      pace: { x: 7, y: 67 },
      accent: { x: 7, y: 73 },
    },
    accentRender: () => (
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
    accentDraw: (ctx, box) => {
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

  luxury: {
    slots: {
      title: {
        text: () => "Performance",
        fontFamily: FONT.ui,
        fontSize: 8,
        fontWeight: 600,
        color: "rgba(212,175,55,0.8)",
        uppercase: true,
        letterSpacing: 3,
      },
      distance: {
        text: fmt.dist1,
        fontFamily: FONT.serif,
        fontSize: 48,
        fontWeight: 700,
        color: "#D4AF37",
        italic: true,
        shadow: { color: "rgba(212,175,55,0.3)", blur: 12, y: 2 },
      },
      pace: {
        text: (d) => `${d.distanceUnit} · ${d.pace} · ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 12,
        fontWeight: 500,
        color: "rgba(212,175,55,0.6)",
        uppercase: true,
        letterSpacing: 1,
      },
    },
    defaultLayout: {
      title: { x: 6, y: 55 },
      distance: { x: 6, y: 58 },
      pace: { x: 6, y: 69 },
    },
  },

  apple: {
    slots: {
      title: {
        text: () => "Today",
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.6)",
        uppercase: true,
        letterSpacing: 1,
      },
      distance: {
        text: fmt.dist1,
        suffix: fmt.unit,
        suffixScale: 0.58,
        suffixColor: "rgba(255,255,255,0.5)",
        fontFamily: FONT.display,
        fontSize: 24,
        fontWeight: 900,
        color: "#FFFFFF",
      },
      pace: {
        text: (d) => `${d.pace} · ${d.time}`,
        fontFamily: FONT.ui,
        fontSize: 10,
        fontWeight: 500,
        color: "rgba(255,255,255,0.4)",
      },
    },
    defaultLayout: {
      accent: { x: 6, y: 57 },
      title: { x: 24, y: 57 },
      distance: { x: 24, y: 60 },
      pace: { x: 24, y: 66 },
    },
    accentRender: () => (
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
    accentDraw: (ctx, box) => {
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
        ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (drawn / radius));
        ctx.stroke();
      });
      ctx.lineCap = "butt";
    },
  },
};
