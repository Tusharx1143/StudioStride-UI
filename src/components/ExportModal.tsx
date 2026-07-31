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
  Zap,
  Sliders,
  FileCheck
} from "lucide-react";
import type {
  CommittedCrop,
  RouteOverlay,
  StatData,
  StickerOverlay,
  TemplateLayout,
  TextOverlay,
} from "../types";
import { renderComposite as composite } from "../utils/renderComposite";
import { useContent } from "../contexts/ContentContext";
import { exportFileStem, projectTitle, shareCaption } from "../utils/projectDoc";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  capturedImage: string;
  /** Lens filter for the photo, already composed with its intensity. */
  imageFilter?: string;
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  /** The activity's GPS path, when one was placed on the canvas. */
  routeOverlay?: RouteOverlay | null;
  drawingCanvas: HTMLCanvasElement | null;
  committedCrop: CommittedCrop;
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
  imageFilter,
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
  const { statDesigns } = useContent();
  const [format, setFormat] = useState<ExportFormat>("png");
  const [resolution, setResolution] = useState<ExportResolution>("1080p");
  const [quality, setQuality] = useState<number>(0.92);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

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

  // Render the full composite canvas image. The compositor itself lives in
  // src/utils/renderComposite.ts so the editor's 320px project thumbnail comes
  // from exactly the same code path as this full-resolution export.
  const renderComposite = async (): Promise<string> => {
    setIsGenerating(true);
    const { width, height } = getResolutionDimensions();

    const dataUrl = await composite({
      width,
      height,
      containerWidth: containerRef.current?.clientWidth || 360,
      containerHeight: containerRef.current?.clientHeight || 640,
      // JPEG has no alpha channel, so it needs an explicit matte.
      background: format === "jpeg" ? "#000000" : null,
      capturedImage,
      imageFilter,
      textOverlays,
      stickerOverlays,
      routeOverlay: routeOverlay ?? null,
      drawingCanvas,
      committedCrop,
      isBaseImageHidden,
      isDrawingHidden,
      baseImageZIndex,
      drawingZIndex,
      templateId,
      statLayout,
      statData,
      // Export has to use the same published design the canvas rendered.
      statDesign: statDesigns[templateId],
      mimeType:
        format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png",
      quality,
    });

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
    const date = new Date().toISOString().slice(0, 10);
    // Named after the activity, so a folder of exports is readable.
    const filename = `${exportFileStem(statData)}-${date}.${ext}`;

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
      const file = new File([blob], `${exportFileStem(statData)}.${ext}`, { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // The activity, not "Check out my snap!" — every fact we already hold
        // was being thrown away here.
        await navigator.share({
          files: [file],
          title: projectTitle(statData),
          text: shareCaption(statData),
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

  // Saving to Projects is deliberately NOT here. Export flattens; Save keeps
  // your layers editable. They are different actions, and the editor's top bar
  // owns the second one.

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

            {/* Secondary Row: Copy */}
            <button
              onClick={handleCopy}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 ${
                copiedSuccess
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-white/10 text-white border-white/15 hover:bg-white/20"
              }`}
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSuccess ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
