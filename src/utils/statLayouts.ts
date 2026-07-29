import type { CustomLayouts, SlotPosition, TemplateLayout } from "../types";
import { getStatDesign } from "../data/templateStatDesigns";

const STORAGE_KEY = "stride_stat_layouts";

/** The layout in effect for a template: the user's drags, else its design. */
export function resolveLayout(
  templateId: string,
  customs: CustomLayouts
): TemplateLayout {
  return customs[templateId] ?? getStatDesign(templateId).defaultLayout;
}

/** Clear the stored custom layout for a template — resets to design default. */
export function resetLayout(
  customs: CustomLayouts,
  templateId: string
): CustomLayouts {
  const next = { ...customs };
  delete next[templateId];
  return next;
}

export interface DragCommit {
  pos: SlotPosition;
  offset: { x: number; y: number };
  canvas: { width: number; height: number };
  chip: { width: number; height: number };
}

/**
 * Converts a pixel drag offset into a new percentage position, clamped so the
 * whole chip stays on canvas. A chip larger than the canvas pins to the origin.
 */
export function commitDrag({ pos, offset, canvas, chip }: DragCommit): SlotPosition {
  const maxX = Math.max(0, 100 - (chip.width / canvas.width) * 100);
  const maxY = Math.max(0, 100 - (chip.height / canvas.height) * 100);

  const rawX = pos.x + (offset.x / canvas.width) * 100;
  const rawY = pos.y + (offset.y / canvas.height) * 100;

  return {
    x: clamp(rawX, 0, maxX),
    y: clamp(rawY, 0, maxY),
  };
}

/** Clamps an already-stored layout, e.g. after an aspect ratio change. */
export function clampLayout(
  layout: TemplateLayout,
  canvas: { width: number; height: number },
  chipSizes: Partial<Record<string, { width: number; height: number }>>
): TemplateLayout {
  const next: TemplateLayout = {};
  for (const [slot, pos] of Object.entries(layout)) {
    if (!pos) continue;
    const chip = chipSizes[slot] ?? { width: 0, height: 0 };
    next[slot as keyof TemplateLayout] = commitDrag({
      pos,
      offset: { x: 0, y: 0 },
      canvas,
      chip,
    });
  }
  return next;
}

export function storeCustomLayout(
  customs: CustomLayouts,
  templateId: string,
  layout: TemplateLayout
): CustomLayouts {
  return { ...customs, [templateId]: layout };
}

export function clearCustomLayout(
  customs: CustomLayouts,
  templateId: string
): CustomLayouts {
  const next = { ...customs };
  delete next[templateId];
  return next;
}

export function hasCustomLayout(customs: CustomLayouts, templateId: string): boolean {
  return Boolean(customs[templateId]);
}

export function loadCustomLayouts(): CustomLayouts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CustomLayouts) : {};
  } catch {
    return {};
  }
}

export function saveCustomLayouts(customs: CustomLayouts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
  } catch {
    // storage unavailable or full; layouts stay in memory for this session
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
