import type {
  CommittedCrop,
  RouteOverlay,
  StatData,
  StickerOverlay,
  TemplateLayout,
  TextOverlay,
} from "../types";
import { drawStatLayer } from "./drawStatLayer";
import { drawRouteLayer } from "./drawRouteLayer";

/**
 * Flattens the editor's layers onto a canvas.
 *
 * Lifted out of ExportModal so the export (1080p and up) and the saved
 * project's thumbnail (320px) come from one compositor. Two implementations
 * would drift, and a thumbnail that disagreed with the export would
 * misrepresent every project card.
 */

export interface CompositeParams {
  /** Output pixel size. */
  width: number;
  height: number;
  /** Preview canvas size the overlay coordinates were authored against. */
  containerWidth: number;
  containerHeight: number;
  /** Fill colour, or null to leave the canvas transparent. */
  background: string | null;
  capturedImage: string;
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  routeOverlay: RouteOverlay | null;
  drawingCanvas: HTMLCanvasElement | null;
  committedCrop: CommittedCrop;
  isBaseImageHidden: boolean;
  isDrawingHidden: boolean;
  baseImageZIndex: number;
  drawingZIndex: number;
  templateId: string;
  statLayout: TemplateLayout;
  statData: StatData;
  mimeType: string;
  quality: number;
}

export interface LayerToDraw {
  type: "image" | "draw" | "text" | "sticker" | "route";
  zIndex: number;
  data?: TextOverlay | StickerOverlay | RouteOverlay;
}

/** Default stacking for overlays that were never explicitly ordered. */
const DEFAULT_TEXT_Z = 20;
const DEFAULT_STICKER_Z = 20;
const DEFAULT_ROUTE_Z = 40;

type CollectParams = Pick<
  CompositeParams,
  | "textOverlays"
  | "stickerOverlays"
  | "routeOverlay"
  | "drawingCanvas"
  | "isBaseImageHidden"
  | "isDrawingHidden"
  | "baseImageZIndex"
  | "drawingZIndex"
>;

/**
 * Which layers get drawn, in the order they get drawn.
 *
 * Hidden layers are dropped, and the drawing layer only participates when a
 * drawing canvas actually exists.
 */
export function collectLayers(p: CollectParams): LayerToDraw[] {
  const layers: LayerToDraw[] = [];

  if (!p.isBaseImageHidden) {
    layers.push({ type: "image", zIndex: p.baseImageZIndex });
  }

  if (!p.isDrawingHidden && p.drawingCanvas) {
    layers.push({ type: "draw", zIndex: p.drawingZIndex });
  }

  p.textOverlays.forEach((t) => {
    if (!t.hidden) {
      layers.push({ type: "text", zIndex: t.zIndex ?? DEFAULT_TEXT_Z, data: t });
    }
  });

  p.stickerOverlays.forEach((s) => {
    if (!s.hidden) {
      layers.push({ type: "sticker", zIndex: s.zIndex ?? DEFAULT_STICKER_Z, data: s });
    }
  });

  if (p.routeOverlay && !p.routeOverlay.hidden) {
    layers.push({
      type: "route",
      zIndex: p.routeOverlay.zIndex ?? DEFAULT_ROUTE_Z,
      data: p.routeOverlay,
    });
  }

  return layers.sort((a, b) => a.zIndex - b.zIndex);
}

/** Returns a data URL, or the untouched background image if no 2D context. */
export async function renderComposite(p: CompositeParams): Promise<string> {
  const { width, height, containerWidth, containerHeight } = p;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return p.capturedImage;

  if (p.background) {
    ctx.fillStyle = p.background;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  const scaleX = width / containerWidth;
  const scaleY = height / containerHeight;

  const layers = collectLayers(p);

  // Render Base Image
  const drawImageLayer = (): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = p.capturedImage;
      img.onload = () => {
        ctx.save();

        // Translate to canvas center for rotation/flipping
        ctx.translate(width / 2, height / 2);

        if (p.committedCrop.rotation !== 0) {
          ctx.rotate((p.committedCrop.rotation * Math.PI) / 180);
        }

        const scaleH = p.committedCrop.flipH ? -1 : 1;
        const scaleV = p.committedCrop.flipV ? -1 : 1;
        ctx.scale(scaleH, scaleV);

        // Calculate aspect cover drawing dimensions
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;

        let drawWidth = width;
        let drawHeight = height;

        if (imgRatio > canvasRatio) {
          drawHeight = height;
          drawWidth = height * imgRatio;
        } else {
          drawWidth = width;
          drawHeight = width / imgRatio;
        }

        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
    });
  };

  // With the base image hidden there is no image pass to follow, so the
  // stats still need to land underneath everything else.
  if (p.isBaseImageHidden) {
    await drawStatLayer(ctx, { width, height }, p.templateId, p.statLayout, p.statData);
  }

  // Draw all layers sequentially
  for (const layer of layers) {
    if (layer.type === "image") {
      await drawImageLayer();
      // Template stats sit directly on the photo, beneath anything the user
      // added afterwards.
      await drawStatLayer(ctx, { width, height }, p.templateId, p.statLayout, p.statData);
    } else if (layer.type === "draw" && p.drawingCanvas) {
      ctx.save();
      ctx.drawImage(p.drawingCanvas, 0, 0, width, height);
      ctx.restore();
    } else if (layer.type === "route" && layer.data) {
      drawRouteLayer(ctx, layer.data as RouteOverlay, {
        containerWidth,
        containerHeight,
        scaleX,
        scaleY,
      });
    } else if (layer.type === "text" && layer.data) {
      const t = layer.data as TextOverlay;
      ctx.save();

      // Text can be pinch-scaled and rotated on canvas, so both have to be
      // reproduced here or the export silently drops the user's gesture.
      const fontSizePx = Math.max(16, t.fontSize * (t.scale ?? 1) * scaleX);
      // Map editor font styles to actual font families matching the in-app rendering
      let fontFamily = '"Inter", sans-serif'; // Classic / Modern default
      if (t.fontStyle === "Bold") fontFamily = '"Archivo", sans-serif';
      if (t.fontStyle === "Modern") fontFamily = "monospace";
      if (t.fontStyle === "Neon") fontFamily = '"Inter", sans-serif';
      if (t.fontStyle === "Serif") fontFamily = "serif";
      if (t.fontStyle === "Typewriter") fontFamily = "monospace";

      ctx.font = `bold ${fontSizePx}px ${fontFamily}`;
      ctx.textAlign = t.align;
      ctx.textBaseline = "middle";

      // Position mapping. Everything below is drawn about the origin so the
      // rotation applies to the pill and the text together.
      const posX = (containerWidth / 2 + t.x) * scaleX;
      const posY = (containerHeight / 2 + t.y) * scaleY;

      ctx.translate(posX, posY);
      if (t.rotation) {
        ctx.rotate((t.rotation * Math.PI) / 180);
      }

      // Background Pill
      if (t.bgStyle !== "none") {
        const metrics = ctx.measureText(t.text);
        const textWidth = metrics.width;
        const textHeight = fontSizePx * 1.2;

        let bgFill = "#000000";
        if (t.bgStyle === "solid" && t.color.toLowerCase() === "#ffffff") {
          bgFill = "#ffffff";
        } else if (t.bgStyle === "semi") {
          bgFill = "rgba(0, 0, 0, 0.65)";
        } else if (t.bgStyle === "outline") {
          bgFill = "rgba(0, 0, 0, 0.4)";
        }

        ctx.fillStyle = bgFill;
        const padX = fontSizePx * 0.4;
        const padY = fontSizePx * 0.2;
        const rectX =
          -(t.align === "center" ? textWidth / 2 : t.align === "right" ? textWidth : 0) - padX;
        const rectY = -textHeight / 2 - padY;
        const rectW = textWidth + padX * 2;
        const rectH = textHeight + padY * 2;

        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectW, rectH, fontSizePx * 0.25);
        ctx.fill();

        if (t.bgStyle === "outline") {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = Math.max(2, fontSizePx * 0.05);
          ctx.stroke();
        }
      }

      // Text fill
      let textFill = t.color;
      if (t.bgStyle === "solid" && t.color.toLowerCase() === "#ffffff") {
        textFill = "#000000";
      }

      ctx.fillStyle = textFill;
      ctx.fillText(t.text, 0, 0);

      ctx.restore();
    } else if (layer.type === "sticker" && layer.data) {
      const s = layer.data as StickerOverlay;
      ctx.save();

      const posX = (containerWidth / 2 + s.x) * scaleX;
      const posY = (containerHeight / 2 + s.y) * scaleY;

      ctx.translate(posX, posY);
      if (s.rotation) {
        ctx.rotate((s.rotation * Math.PI) / 180);
      }

      const stickerSize = 48 * s.scale * scaleX;

      if (s.type === "badge" || s.type === "metric") {
        ctx.font = `bold ${Math.max(14, stickerSize * 0.4)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const metrics = ctx.measureText(s.content);
        const textW = metrics.width;
        const padX = 16 * scaleX;
        const padY = 8 * scaleY;

        // Draw pill badge
        const grad = ctx.createLinearGradient(-textW / 2, 0, textW / 2, 0);
        grad.addColorStop(0, "#FF7A1A");
        grad.addColorStop(1, "#FFB020");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(-textW / 2 - padX, -padY * 1.5, textW + padX * 2, padY * 3, 12 * scaleX);
        ctx.fill();

        ctx.fillStyle = "#0B0C10";
        ctx.fillText(s.content, 0, 0);
      } else {
        // Emoji / Location sticker
        ctx.font = `${stickerSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.content, 0, 0);
      }

      ctx.restore();
    }
  }

  return canvas.toDataURL(p.mimeType, p.quality);
}
