import type { TemplateStatDesign } from "../../types";
import { BOLD_DESIGNS } from "./bold";
import { CHART_DESIGNS } from "./chart";
import { CLASSIC_DESIGNS } from "./classic";
import { CLEAN_DESIGNS } from "./clean";
import { SOCIAL_DESIGNS } from "./social";
import { TECH_DESIGNS } from "./tech";
import { FONT, VOLT, fmt } from "./shared";

/** Fallback for any template id without its own entry. */
const DEFAULT_DESIGN: TemplateStatDesign = {
  slots: {
    distance: {
      text: fmt.dist2,
      suffix: fmt.unit,
      suffixScale: 0.5,
      suffixColor: VOLT,
      fontFamily: FONT.display,
      fontSize: 36,
      fontWeight: 900,
      color: "#FFFFFF",
      letterSpacing: -1,
      shadow: { color: "rgba(0,0,0,0.5)", blur: 14, y: 3 },
    },
    pace: {
      text: fmt.pace,
      fontFamily: FONT.ui,
      fontSize: 12,
      fontWeight: 500,
      color: "rgba(255,255,255,0.7)",
    },
    time: {
      text: fmt.time,
      fontFamily: FONT.ui,
      fontSize: 12,
      fontWeight: 500,
      color: "rgba(255,255,255,0.7)",
    },
  },
  defaultLayout: {
    distance: { x: 6, y: 58 },
    pace: { x: 6, y: 68 },
    time: { x: 22, y: 68 },
  },
};

export const TEMPLATE_STAT_DESIGNS: Record<string, TemplateStatDesign> = {
  ...BOLD_DESIGNS,
  ...CLASSIC_DESIGNS,
  ...CLEAN_DESIGNS,
  ...TECH_DESIGNS,
  ...SOCIAL_DESIGNS,
  ...CHART_DESIGNS,
  default: DEFAULT_DESIGN,
};

export function getStatDesign(templateId: string): TemplateStatDesign {
  return TEMPLATE_STAT_DESIGNS[templateId] ?? DEFAULT_DESIGN;
}

export { FONT, VOLT, fmt } from "./shared";
