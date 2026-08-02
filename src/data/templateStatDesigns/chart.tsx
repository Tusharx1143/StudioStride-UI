/**
 * Templates whose composition is built around a chart slot.
 *
 * These are the first designs here that are not "type over a photo", which is
 * why they get their own table rather than being folded into the bold, clean
 * or classic families — the thing they have in common is the engine they use,
 * not a visual register.
 */

import type { TemplateStatDesign } from "../../types";
import { FONT, VOLT, fmt } from "./shared";

export const CHART_DESIGNS: Record<string, TemplateStatDesign> = {
  /** Route is the hero; distance and title reduce to a caption beneath it. */
  trace: {
    slots: {
      distance: {
        text: fmt.dist2,
        suffix: fmt.unitUpper,
        suffixScale: 0.36,
        suffixColor: VOLT,
        fontFamily: FONT.display,
        fontSize: 34,
        fontWeight: 900,
        color: "#FFFFFF",
        letterSpacing: -1.5,
        shadow: { color: "rgba(0,0,0,0.5)", blur: 16, y: 3 },
      },
      title: {
        text: fmt.title,
        fontFamily: FONT.ui,
        fontSize: 9,
        fontWeight: 600,
        color: "rgba(255,255,255,0.55)",
        uppercase: true,
        letterSpacing: 3,
      },
    },
    charts: {
      route: {
        chart: "route_trace",
        // 310 of the 390 reference width — a template whose whole premise is
        // "the route is the hero" cannot afford a polite little thumbnail.
        width: 310,
        height: 310,
        color: "#FFFFFF",
        trackColor: "rgba(0,0,0,0.5)",
        strokeWidth: 3,
        // Casing is what keeps a white trace legible over a bright sky.
        options: { fit: "contain", casing: true, showStartDot: true },
      },
    },
    requires: ["route"],
    defaultLayout: {
      // 310 ref px is 44.7% of a 9:16 canvas, so 20 → 65 leaves the lower
      // third for type and keeps the trace optically centred.
      route: { x: 10, y: 20 },
      title: { x: 8, y: 74 },
      distance: { x: 8, y: 78 },
    },
  },

  /** Splits drive the composition, and pace is the headline, not distance. */
  tempo: {
    slots: {
      pace: {
        text: fmt.pace,
        fontFamily: FONT.display,
        fontSize: 46,
        fontWeight: 900,
        color: "#FFFFFF",
        letterSpacing: -2,
        shadow: { color: "rgba(0,0,0,0.5)", blur: 16, y: 3 },
      },
      distance: {
        text: fmt.dist2,
        suffix: fmt.unitUpper,
        suffixScale: 0.62,
        suffixColor: VOLT,
        fontFamily: FONT.ui,
        // Was 10px at 60% white with 2.5 tracking, which read as noise under
        // a 46px headline rather than as the second line of the pair.
        fontSize: 14,
        fontWeight: 700,
        color: "rgba(255,255,255,0.88)",
        uppercase: true,
        letterSpacing: 1.8,
      },
    },
    charts: {
      splits: {
        chart: "splits_bars",
        width: 340,
        height: 88,
        color: "rgba(255,255,255,0.32)",
        accentColor: "#F4E409",
        options: { maxBars: 14, highlightFastest: true, radius: 2 },
      },
    },
    requires: ["splits"],
    defaultLayout: {
      splits: { x: 6, y: 57 },
      pace: { x: 6, y: 73 },
      // Pulled up from 86 to sit as the headline's second line rather than
      // drifting alone near the safe-area edge.
      distance: { x: 6, y: 83 },
    },
  },

  /** The whole surface, on black. Reads as a data product, not a filter. */
  datanerd: {
    slots: {
      distance: {
        text: fmt.dist2,
        suffix: fmt.unitUpper,
        suffixScale: 0.34,
        suffixColor: VOLT,
        fontFamily: FONT.display,
        fontSize: 40,
        fontWeight: 900,
        color: "#FFFFFF",
        letterSpacing: -1.5,
      },
      title: {
        text: fmt.title,
        fontFamily: FONT.ui,
        fontSize: 9,
        fontWeight: 700,
        color: VOLT,
        uppercase: true,
        letterSpacing: 3,
      },
      pace: {
        text: fmt.pace,
        fontFamily: FONT.ui,
        fontSize: 15,
        fontWeight: 700,
        color: "#FFFFFF",
      },
      time: {
        text: fmt.time,
        fontFamily: FONT.ui,
        fontSize: 15,
        fontWeight: 700,
        color: "#FFFFFF",
      },
    },
    charts: {
      route: {
        chart: "route_trace",
        width: 200,
        height: 200,
        color: VOLT,
        strokeWidth: 3,
        options: { fit: "contain", showStartDot: true },
      },
      splits: {
        chart: "splits_bars",
        width: 320,
        height: 60,
        color: VOLT,
        accentColor: "#FFFFFF",
        options: { maxBars: 16, highlightFastest: true },
      },
    },
    requires: ["route", "splits"],
    // An even vertical rhythm: the route runs 20→49, the bars 60→69, and the
    // metric row anchors at 80. The previous numbers left a 22% void between
    // the bars and the footer that read as a rendering failure.
    defaultLayout: {
      title: { x: 7, y: 8 },
      distance: { x: 7, y: 11 },
      route: { x: 24, y: 20 },
      splits: { x: 7, y: 60 },
      pace: { x: 7, y: 80 },
      time: { x: 40, y: 80 },
    },
  },

  /**
   * Ink on cream — the first table here that is not light-on-dark.
   *
   * That is the point of it: it proves the chart renderers take every colour
   * from the style object rather than assuming a photo underneath.
   */
  bib: {
    slots: {
      distance: {
        text: fmt.dist2,
        fontFamily: FONT.display,
        // A race bib is one enormous number. 52 left it competing with the
        // white space instead of owning it.
        fontSize: 78,
        fontWeight: 900,
        color: "#16150F",
        letterSpacing: -3,
      },
      title: {
        text: fmt.title,
        fontFamily: FONT.ui,
        fontSize: 8,
        fontWeight: 700,
        color: "#8A8375",
        uppercase: true,
        letterSpacing: 3,
      },
      // Pace and time are the stub's detail line — the part a marshal reads
      // after the number. Kept to the muted ink so the 78px distance above
      // the tear line stays the only thing shouting.
      pace: {
        text: fmt.pace,
        suffix: (d) => `/${d.distanceUnit.toUpperCase()}`,
        suffixScale: 0.5,
        suffixColor: "#8A8375",
        fontFamily: FONT.ui,
        fontSize: 20,
        fontWeight: 700,
        color: "#16150F",
        letterSpacing: 0.5,
      },
      time: {
        text: fmt.time,
        fontFamily: FONT.ui,
        fontSize: 20,
        fontWeight: 700,
        color: "#16150F",
        letterSpacing: 0.5,
      },
    },
    charts: {
      splits: {
        chart: "splits_bars",
        width: 320,
        height: 62,
        color: "#16150F",
        accentColor: "#C2410C",
        options: { maxBars: 12, highlightFastest: true },
      },
      // The perforations. Tear-off stubs are what make a bib read as a bib
      // rather than as cream stationery.
      ruleTop: {
        chart: "paper_rule",
        width: 320,
        height: 4,
        // The muted ink the title already uses. #C9C2B1 read as a smudge on
        // cream; a tear line should be unmistakably a line.
        color: "#8A8375",
        strokeWidth: 2,
        options: { dash: 8, gap: 6 },
      },
      ruleBottom: {
        chart: "paper_rule",
        width: 320,
        height: 4,
        // The muted ink the title already uses. #C9C2B1 read as a smudge on
        // cream; a tear line should be unmistakably a line.
        color: "#8A8375",
        strokeWidth: 2,
        options: { dash: 8, gap: 6 },
      },
    },
    // Decoration is never required — the rules draw from their own style, so
    // listing them here would disable the template on every activity.
    requires: ["splits"],
    /**
     * A bib is two panels divided by the tear line.
     *
     * Above it, the card: label and the one enormous number, with the white
     * space a race number is supposed to sit in. Below it, the stub, which
     * carries the detail — the splits shape, then pace and elapsed. Putting
     * the bars in the stub is what stops that panel reading as an unfinished
     * bottom third.
     *
     * Content stops at 81%: the last ~15% of a 9:16 story is under Instagram's
     * reply bar, so anything placed there is not really on the canvas.
     */
    defaultLayout: {
      title: { x: 8, y: 12 },
      ruleTop: { x: 8, y: 17 },
      distance: { x: 8, y: 21 },
      ruleBottom: { x: 8, y: 54 },
      splits: { x: 8, y: 62 },
      pace: { x: 8, y: 77 },
      time: { x: 52, y: 77 },
    },
  },
};
