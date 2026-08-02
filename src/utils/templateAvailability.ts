/**
 * Whether a template is worth offering for a given activity.
 *
 * Slot-level availability is not enough. Skipping an unavailable slot works
 * for a template that merely decorates with a chart, but a template whose
 * whole composition *is* that chart would render as an empty rectangle — and
 * nothing about its slots says so, because its text slots still resolve.
 *
 * `requires` states it declaratively rather than inferring it. Deriving
 * unavailability from "every slot is unavailable" would keep a route-only
 * template enabled forever, since its distance and title always resolve.
 */

import type { StatData, TemplateStatDesign } from "../types";
import { getChartEntry } from "../data/chartRegistry";
import { TEMPLATE_STAT_DESIGNS } from "../data/templateStatDesigns";

export function isTemplateAvailable(
  design: TemplateStatDesign,
  data: StatData
): boolean {
  const required = design.requires ?? [];
  if (required.length === 0) return true;

  return required.every((slot) => {
    const style = design.charts?.[slot];
    // Requiring a slot the template never draws is a design-table bug. Treat
    // it as unavailable rather than throwing — the picker dims one tile
    // instead of the editor failing to render.
    if (!style) return false;
    return getChartEntry(style.chart)?.available(data) === true;
  });
}

/**
 * Template ids this activity cannot use, for dimming the picker.
 *
 * Dimmed rather than hidden: a tile that vanishes reads as a bug, where a
 * dimmed one tells the user something true about their own data.
 */
export function unavailableTemplateIds(
  data: StatData,
  designs: Record<string, TemplateStatDesign> = TEMPLATE_STAT_DESIGNS
): string[] {
  return Object.entries(designs)
    .filter(([, design]) => !isTemplateAvailable(design, data))
    .map(([id]) => id);
}
