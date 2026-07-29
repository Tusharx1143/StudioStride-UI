import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Download,
  Copy,
  Share2,
  Check,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Bookmark,
  Zap,
  Sliders,
  FileCheck
} from "lucide-react";
import type { RouteOverlay, StatData, TemplateLayout } from "../types";
import { drawStatLayer } from "../utils/drawStatLayer";
import { drawRouteLayer } from "../utils/drawRouteLayer";

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontStyle: "Classic" | "Modern" | "Bold" | "Neon" | "Serif" | "Typewriter";
  bgStyle: "none" | "solid" | "semi" | "outline";
  align: "left" | "center" | "right";
  fontSize: number;
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
}

interface StickerOverlay {
  id: string;
  content: string;
  type: "emoji" | "badge" | "metric" | "location";
  scale: number;
  rotation: number;
  x: number;
  y: number;
  bgGradient?: string;
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  capturedImage: string;
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  /** The activity's GPS path, when one was placed on the canvas. */
  routeOverlay?: RouteOverlay | null;
  drawingCanvas: HTMLCanvasElement | null;
  committedCrop: {
    ratio: string;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
  };
  isBaseImageHidden: boolean;
  isDrawingHidden: boolean;
  baseImageZIndex: number;
  drawingZIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  showToast: (msg: string) => void;
  templateId: string;
  statLayout: TemplateLayout;
  statData: StatData;
}

type ExportFormat = "png" | "jpeg" | "webp";
type ExportResolution = "1080p" | "1440p" | "2160p";

export default function ExportModal({
  isOpen,
  onClose,
  capturedImage,
  textOverlays,
  stickerOverlays,
  routeOverlay,
  drawingCanvas,
  committedCrop,
  isBaseImageHidden,
  isDrawingHidden,
  baseImageZIndex,
  drawingZIndex,
  containerRef,
  showToast,
  templateId,
  statLayout,
  statData,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [resolution, setResolution] = useState<ExportResolution>("1080p");
  const [quality, setQuality] = useState<number>(0.92);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper to map resolution name to pixel dimensions
  const getResolutionDimensions = () => {
    let baseWidth = 1080;
    let baseHeight = 1920;

    if (committedCrop.ratio === "1:1") {
      baseWidth = 1080;
      baseHeight = 1080;
    } else if (committedCrop.ratio === "4:5") {
      baseWidth = 1080;
      baseHeight = 1350;
    } else if (committedCrop.ratio === "16:9") {
      baseWidth = 1920;
      baseHeight = 1080;
    }

    let multiplier = 1;
    if (resolution === "1440p") multiplier = 1.333;
    if (resolution === "2160p") multiplier = 2.0;

    return {
      width: Math.round(baseWidth * multiplier),
      height: Math.round(baseHeight * multiplier),
    };
  };

  // Render the full composite canvas image
  const renderComposite = async (): Promise<string> => {
    setIsGenerating(true);
    const { width, height } = getResolutionDimensions();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setIsGenerating(false);
      return capturedImage;
    }

    // Fill background if format is JPEG or dark canvas
    if (format === "jpeg") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    // Reference container size for relative positioning calculations
    const containerWidth = containerRef.current?.clientWidth || 360;
    const containerHeight = containerRef.current?.clientHeight || 640;
    const scaleX = width / containerWidth;
    const scaleY = height / containerHeight;

    // Collect layers to render in order of zIndex
    interface LayerToDraw {
      type: "image" | "draw" | "text" | "sticker" | "route";
      zIndex: number;
      data?: any;
    }

    const layers: LayerToDraw[] = [];

    if (!isBaseImageHidden) {
      layers.push({ type: "image", zIndex: baseImageZIndex });
    }

    if (!isDrawingHidden && drawingCanvas) {
      layers.push({ type: "draw", zIndex: drawingZIndex });
    }

    textOverlays.forEach((t) => {
      if (!t.hidden) {
        layers.push({ type: "text", zIndex: t.zIndex ?? 20, data: t });
      }
    });

    stickerOverlays.forEach((s) => {
      if (!s.hidden) {
        layers.push({ type: "sticker", zIndex: s.zIndex ?? 20, data: s });
      }
    });

    if (routeOverlay && !routeOverlay.hidden) {
      layers.push({ type: "route", zIndex: routeOverlay.zIndex ?? 40, data: routeOverlay });
    }

    layers.sort((a, b) => a.zIndex - b.zIndex);

    // Render Base Image
    const drawImageLayer = (): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = capturedImage;
        img.onload = () => {
          ctx.save();

          // Translate to canvas center for rotation/flipping
          ctx.translate(width / 2, height / 2);

          if (committedCrop.rotation !== 0) {
            ctx.rotate((committedCrop.rotation * Math.PI) / 180);
          }

          const scaleH = committedCrop.flipH ? -1 : 1;
          const scaleV = committedCrop.flipV ? -1 : 1;
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
    if (isBaseImageHidden) {
      await drawStatLayer(ctx, { width, height }, templateId, statLayout, statData);
    }

    // Draw all layers sequentially
    for (const layer of layers) {
      if (layer.type === "image") {
        await drawImageLayer();
        // Template stats sit directly on the photo, beneath anything the user
        // added afterwards.
        await drawStatLayer(ctx, { width, height }, templateId, statLayout, statData);
      } else if (layer.type === "draw" && drawingCanvas) {
        ctx.save();
        ctx.drawImage(drawingCanvas, 0, 0, width, height);
        ctx.restore();
      } else if (layer.type === "route" && layer.data) {
        drawRouteLayer(ctx, layer.data as RouteOverlay, {
          containerWidth,
          containerHeight,
          scaleX,
          scaleY,
        });
      } else if (layer.type === "text" && layer.data) {
        const t: TextOverlay = layer.data;
        ctx.save();

        const fontSizePx = Math.max(16, t.fontSize * scaleX);
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

        // Position mapping
        const posX = (containerWidth / 2 + t.x) * scaleX;
        const posY = (containerHeight / 2 + t.y) * scaleY;

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
          const rectX = posX - (t.align === "center" ? textWidth / 2 : t.align === "right" ? textWidth : 0) - padX;
          const rectY = posY - textHeight / 2 - padY;
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
        ctx.fillText(t.text, posX, posY);

        ctx.restore();
      } else if (layer.type === "sticker" && layer.data) {
        const s: StickerOverlay = layer.data;
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

    const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    const dataUrl = canvas.toDataURL(mimeType, quality);
    setIsGenerating(false);
    return dataUrl;
  };

  // Debounced preview regeneration to avoid expensive recomputation on every change
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPreviewDataUrl(null);
      return;
    }

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setPreviewDataUrl(null); // clear stale preview while debouncing
    previewTimerRef.current = setTimeout(() => {
      renderComposite().then((url) => setPreviewDataUrl(url));
    }, 400);

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [isOpen, format, resolution, quality]);

  if (!isOpen) return null;

  // Handle Download File
  const handleDownload = async () => {
    const url = previewDataUrl || (await renderComposite());
    const ext = format === "jpeg" ? "jpg" : format;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `snap_export_${timestamp}.${ext}`;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Downloaded ${filename.toUpperCase()}`);
    onClose();
  };

  // Handle Copy Image
  const handleCopy = async () => {
    try {
      const url = previewDataUrl || (await renderComposite());
      const res = await fetch(url);
      const blob = await res.blob();

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        setCopiedSuccess(true);
        showToast("Copied image to clipboard!");
        setTimeout(() => setCopiedSuccess(false), 2000);
      } else {
        showToast("Clipboard copy not supported on this browser.");
      }
    } catch {
      showToast("Unable to copy to clipboard.");
    }
  };

  // Handle Native Share
  const handleShare = async () => {
    try {
      const url = previewDataUrl || (await renderComposite());
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = format === "jpeg" ? "jpg" : format;
      const file = new File([blob], `snap.${ext}`, { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Snap Creation",
          text: "Check out my snap!",
        });
        showToast("Shared successfully!");
      } else {
        // Fallback to copy or download
        handleDownload();
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        showToast("Sharing failed. Image downloaded instead.");
        handleDownload();
      }
    }
  };

  // Handle Save to Projects / Memories
  const handleSaveToProjects = async () => {
    const url = previewDataUrl || (await renderComposite());
    const existing = localStorage.getItem("stride_projects");
    const projectsList = existing ? JSON.parse(existing) : [];

    const newProject = {
      id: `proj_${Date.now()}`,
      title: `Snap ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      activityType: "Exported Snap",
      date: "Just now",
      bgImage: url,
      lensId: "custom",
      distance: "-",
      pace: "-",
      time: "-",
      updatedAt: "Just now",
      placedTextsCount: textOverlays.length,
      // Kept so reopening the project restores the route rather than
      // silently dropping the layer.
      ...(routeOverlay ? { route: routeOverlay } : {}),
    };

    localStorage.setItem("stride_projects", JSON.stringify([newProject, ...projectsList]));
    setSavedSuccess(true);
    showToast("Saved to Projects gallery!");
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Export project"
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          className="w-full max-w-lg bg-neutral-900 border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-ember/20 text-ember border border-ember/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Export Creation</h3>
                <p className="text-xs text-white/50">Save, share or copy your creation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview Canvas Thumbnail */}
          <div className="relative w-full aspect-[9/16] max-h-56 bg-black rounded-2xl overflow-hidden border border-white/10 mb-5 flex items-center justify-center shadow-inner group">
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Export preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/50 text-xs">
                <div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" />
                <span>Generating high-res export...</span>
              </div>
            )}
            <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-ember border border-white/10">
              {resolution} • {format.toUpperCase()}
            </div>
          </div>

          {/* Export Settings */}
          <div className="space-y-4 mb-6">
            {/* Format Selection */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-2">Image Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(["png", "jpeg", "webp"] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      format === f
                        ? "bg-ember text-ink border-ember font-black shadow-[0_0_12px_rgba(255,122,26,0.3)]"
                        : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality / Resolution Selection */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-2">Export Resolution</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "1080p", label: "1080p Full HD" },
                  { id: "1440p", label: "2K High-Res" },
                  { id: "2160p", label: "4K Ultra-HD" },
                ].map((res) => (
                  <button
                    key={res.id}
                    onClick={() => setResolution(res.id as ExportResolution)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all border ${
                      resolution === res.id
                        ? "bg-white text-black border-white font-black shadow-lg"
                        : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-2.5">
            {/* Primary Row: Download + Share side by side */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-2xl bg-ember hover:bg-ember-press text-ink font-black text-sm shadow-[0_0_20px_rgba(255,122,26,0.4)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                <Download className="w-4 h-4 fill-ink" />
                <span>Download</span>
              </button>

              <button
                onClick={handleShare}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-sm shadow-[0_0_20px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            {/* Secondary Row: Copy + Save */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 ${
                  copiedSuccess
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-white/10 text-white border-white/15 hover:bg-white/20"
                }`}
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSuccess ? "Copied" : "Copy"}</span>
              </button>

              <button
                onClick={handleSaveToProjects}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 ${
                  savedSuccess
                    ? "bg-ember/20 text-ember border-ember/40"
                    : "bg-white/10 text-white border-white/15 hover:bg-white/20"
                }`}
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5 text-ember" />}
                <span>{savedSuccess ? "Saved" : "Save App"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
