import type {
  SlotStyle,
  StatData,
  StatSlotId,
  TemplateLayout,
  TemplateStatDesign,
} from "../types";
import { getStatDesign } from "../data/templateStatDesigns";
import { resolveSlotStyle } from "./metricSlots";
import { roundRectPath } from "../data/templateStatDesigns/shared";

/** Must match REFERENCE_WIDTH in StatLayer.tsx. */
const REFERENCE_WIDTH = 390;

/**
 * Paints the template's stat slots onto an export canvas, reading the same
 * design table the DOM renderer uses so the two stay in step.
 */
export async function drawStatLayer(
  ctx: CanvasRenderingContext2D,
  canvas: { width: number; height: number },
  templateId: string,
  layout: TemplateLayout,
  data: StatData,
  /** Published design for this template. Omitted = use the hardcoded table. */
  design: TemplateStatDesign = getStatDesign(templateId)
): Promise<void> {
  // ctx.font falls back silently when a webfont has not loaded yet.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // proceed with whatever is available
    }
  }

  const scale = canvas.width / REFERENCE_WIDTH;

  for (const slot of Object.keys(layout) as StatSlotId[]) {
    const pos = layout[slot];
    if (!pos) continue;

    const originX = (pos.x / 100) * canvas.width;
    const originY = (pos.y / 100) * canvas.height;

    if (slot === "accent") {
      if (!design.accentDraw) continue;
      ctx.save();
      design.accentDraw(ctx, { x: originX, y: originY, scale }, data);
      ctx.restore();
      continue;
    }

    // One resolver for the DOM preview and this canvas twin, so a metric chip
    // cannot look different in the export than it did on screen.
    const style = resolveSlotStyle(design, slot, data);
    if (!style) continue;

    ctx.save();
    drawSlot(ctx, style, data, originX, originY, scale);
    ctx.restore();
  }
}

function drawSlot(
  ctx: CanvasRenderingContext2D,
  style: SlotStyle,
  data: StatData,
  originX: number,
  originY: number,
  scale: number
) {
  const raw = style.text(data);
  const text = style.uppercase ? raw.toUpperCase() : raw;
  const rawSuffix = style.suffix?.(data);
  const suffix = rawSuffix && style.uppercase ? rawSuffix.toUpperCase() : rawSuffix;

  const fontSize = style.fontSize * scale;
  const suffixSize = fontSize * (style.suffixScale ?? 0.5);

  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const mainFont = fontSpec(style, fontSize);
  ctx.font = mainFont;
  const mainWidth = ctx.measureText(text).width + letterSpacingWidth(style, text, scale);

  let suffixWidth = 0;
  const suffixGap = suffix ? fontSize * 0.25 : 0;
  if (suffix) {
    ctx.font = fontSpec(style, suffixSize);
    suffixWidth = ctx.measureText(suffix).width;
  }

  const contentWidth = mainWidth + suffixGap + suffixWidth;
  const contentHeight = fontSize * 1.1;

  const padX = (style.bg?.padX ?? 0) * scale;
  const padY = (style.bg?.padY ?? 0) * scale;

  if (style.rotation) {
    const cx = originX + contentWidth / 2 + padX;
    const cy = originY + contentHeight / 2 + padY;
    ctx.translate(cx, cy);
    ctx.rotate((style.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  if (style.bg) {
    const boxW = contentWidth + padX * 2;
    const boxH = contentHeight + padY * 2;
    if (style.shadow) {
      ctx.save();
      ctx.shadowColor = style.shadow.color;
      ctx.shadowBlur = style.shadow.blur * scale;
      ctx.shadowOffsetX = (style.shadow.x ?? 0) * scale;
      ctx.shadowOffsetY = (style.shadow.y ?? 0) * scale;
      ctx.fillStyle = solidify(style.bg.fill, style.bg.blur);
      roundRectPath(ctx, originX, originY, boxW, boxH, style.bg.radius * scale);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = solidify(style.bg.fill, style.bg.blur);
      roundRectPath(ctx, originX, originY, boxW, boxH, style.bg.radius * scale);
      ctx.fill();
    }
    if (style.bg.border) {
      ctx.strokeStyle = style.bg.border;
      ctx.lineWidth = Math.max(1, scale);
      roundRectPath(ctx, originX, originY, boxW, boxH, style.bg.radius * scale);
      ctx.stroke();
    }
  } else if (style.shadow) {
    ctx.shadowColor = style.shadow.color;
    ctx.shadowBlur = style.shadow.blur * scale;
    ctx.shadowOffsetX = (style.shadow.x ?? 0) * scale;
    ctx.shadowOffsetY = (style.shadow.y ?? 0) * scale;
  }

  const textX = originX + padX;
  const textY = originY + padY;

  ctx.font = mainFont;
  ctx.fillStyle = style.color;
  const advanced = drawTracked(ctx, text, textX, textY, style, scale);

  if (suffix) {
    ctx.font = fontSpec(style, suffixSize);
    ctx.fillStyle = style.suffixColor ?? style.color;
    ctx.fillText(suffix, textX + advanced + suffixGap, textY + (fontSize - suffixSize) * 0.85);
  }
}

/** Canvas has no letter-spacing on older engines, so tracked text is drawn per glyph. */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: SlotStyle,
  scale: number
): number {
  if (!style.letterSpacing) {
    ctx.fillText(text, x, y);
    return ctx.measureText(text).width;
  }

  const spacing = style.letterSpacing * scale;
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
  return cursor - x;
}

function letterSpacingWidth(style: SlotStyle, text: string, scale: number): number {
  if (!style.letterSpacing) return 0;
  return style.letterSpacing * scale * Math.max(0, [...text].length - 1);
}

function fontSpec(style: SlotStyle, size: number): string {
  const italic = style.italic ? "italic " : "";
  return `${italic}${style.fontWeight} ${size}px ${style.fontFamily}`;
}

/**
 * backdrop-blur cannot be reproduced on a 2D canvas. Blurred chips export as a
 * more opaque solid fill, which reads closest to the blurred original.
 */
function solidify(fill: string, blurred?: boolean): string {
  if (!blurred) return fill;
  const match = fill.match(/rgba?\(([^)]+)\)/);
  if (!match) return fill;
  const parts = match[1].split(",").map((p) => p.trim());
  if (parts.length < 4) return fill;
  const alpha = Math.min(1, parseFloat(parts[3]) + 0.25);
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}
