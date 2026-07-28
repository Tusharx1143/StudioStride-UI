export const STRIP_SEEN_KEY = "stride_stat_strip_seen";

export interface StripPlacementInput {
  /** Selected slot's top edge, as a percentage of the canvas. */
  slotY: number;
  /** Selected slot's height, as a percentage of the canvas. */
  slotHeight: number;
  stripHeight: number;
  gap: number;
  bounds: { min: number; max: number };
}

export interface StripPlacement {
  top: number;
  side: "above" | "below";
}

/**
 * Anchors the strip just above the selected stat, flipping below when the stat
 * sits too close to the top edge. The result is always fully inside bounds.
 */
export function placeStrip({
  slotY,
  slotHeight,
  stripHeight,
  gap,
  bounds,
}: StripPlacementInput): StripPlacement {
  const highest = bounds.min;
  const lowest = Math.max(bounds.min, bounds.max - stripHeight);

  const above = slotY - stripHeight - gap;
  if (above >= highest) {
    return { top: clamp(above, highest, lowest), side: "above" };
  }

  const below = slotY + slotHeight + gap;
  return { top: clamp(below, highest, lowest), side: "below" };
}

/** True only the first time an editor session has a template to switch. */
export function shouldAutoOpenStrip(hasTemplate: boolean): boolean {
  if (!hasTemplate) return false;
  try {
    return !localStorage.getItem(STRIP_SEEN_KEY);
  } catch {
    return false;
  }
}

export function markStripSeen(): void {
  try {
    localStorage.setItem(STRIP_SEEN_KEY, "1");
  } catch {
    // storage unavailable; the strip simply auto-opens again next time
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
