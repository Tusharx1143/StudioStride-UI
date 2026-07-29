import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Type,
  PenTool,
  StickyNote,
  Download,
  Send,
  Undo,
  Redo,
  Sparkles,
  Crop,
  Info,
  Check,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Search,
  Award,
  Flame,
  MapPin,
  Smile,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  Eraser,
  Highlighter,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Copy,
  Plus,
  Image as ImageIcon
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { LENS_TEMPLATES_EXPANDED, LENS_FILTER_MAP, STOCK_PHOTOS } from "../data/mockData";
import type { StatData, StatSlotId, TemplateFamily, TemplateLayout } from "../types";
import GestureSwipeCarousel from "./GestureSwipeCarousel";
import ExportModal from "./ExportModal";
import StatLayer from "./StatLayer";
import StatToolbar from "./StatToolbar";
import DraggableLayer from "./DraggableLayer";
import SnapGuides from "./SnapGuides";
import type { SnapLine } from "../utils/snapping";
import { triggerHaptic } from "../utils/haptics";
import { TEMPLATE_FAMILIES } from "../data/mockData";
import {
  loadCustomLayouts,
  resolveLayout,
  saveCustomLayouts,
  storeCustomLayout,
} from "../utils/statLayouts";
import { markStripSeen, shouldAutoOpenStrip } from "../utils/statStrip";

// Text Overlay item model
interface TextOverlay {
  id: string;
  text: string;
  x: number; // relative position in px or offset
  y: number;
  color: string;
  fontStyle: "Classic" | "Modern" | "Bold" | "Neon" | "Serif" | "Typewriter";
  bgStyle: "none" | "solid" | "semi" | "outline";
  align: "left" | "center" | "right";
  fontSize: number; // in px
  rotation?: number; // in degrees
  scale?: number; // scale multiplier
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
}

// Sticker Overlay item model
interface StickerOverlay {
  id: string;
  content: string; // Emoji, SVG badge text, or image URL
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

// Pre-defined Sticker Item interface
interface StickerItem {
  id: string;
  content: string;
  label: string;
  category: "Badges" | "Stats" | "Locations";
  type: "badge" | "metric" | "location";
  bgGradient?: string;
  /** If set, replaces content with the stat value from statData on add. */
  statKey?: string;
}

const STICKER_LIBRARY: StickerItem[] = [
  // Activity Stats — dynamic values from the current activity
  { id: "st_s1", content: "DISTANCE", label: "Distance", category: "Stats", type: "metric", bgGradient: "from-ember to-ember-lift text-ink", statKey: "distance" },
  { id: "st_s2", content: "PACE", label: "Pace", category: "Stats", type: "metric", bgGradient: "from-sky-500 to-blue-600", statKey: "pace" },
  { id: "st_s3", content: "TIME", label: "Time", category: "Stats", type: "metric", bgGradient: "from-rose-500 to-pink-600", statKey: "time" },
  { id: "st_s4", content: "TITLE", label: "Activity Title", category: "Stats", type: "metric", bgGradient: "from-amber-500 to-orange-600", statKey: "title" },

  // Badges & Milestones
  { id: "st_2", content: "BEAST MODE 🔥", label: "Beast Mode", category: "Badges", type: "badge", bgGradient: "from-orange-600 to-red-500" },
  { id: "st_5", content: "RUNNER'S HIGH ⚡", label: "Runner's High", category: "Badges", type: "badge", bgGradient: "from-cyan-500 to-blue-600" },
  { id: "st_7", content: "FINISHER", label: "Finisher", category: "Badges", type: "badge", bgGradient: "from-yellow-400 to-amber-600" },

  // Locations — without trailing emojis
  { id: "st_l1", content: "CENTRAL PARK", label: "Central Park", category: "Locations", type: "location", bgGradient: "from-emerald-600 to-green-500" },
  { id: "st_l2", content: "SEA OCEAN TRAIL", label: "Sea Trail", category: "Locations", type: "location", bgGradient: "from-indigo-600 to-blue-500" },
  { id: "st_l4", content: "GOLDEN GATE", label: "Golden Gate", category: "Locations", type: "location", bgGradient: "from-rose-600 to-orange-500" },
];

// Available Fonts
const FONT_STYLES: { id: TextOverlay["fontStyle"]; label: string; className: string }[] = [
  { id: "Classic", label: "Classic", className: "font-sans font-semibold tracking-normal" },
  { id: "Modern", label: "Modern", className: "font-mono tracking-wider text-transform uppercase" },
  { id: "Bold", label: "Bold", className: "font-black tracking-tighter uppercase font-display" },
  { id: "Neon", label: "Neon", className: "font-sans font-extrabold tracking-wide drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" },
  { id: "Serif", label: "Serif", className: "font-serif italic font-medium" },
  { id: "Typewriter", label: "Typewriter", className: "font-mono font-medium tracking-tight" },
];

// Vibrant Snapchat style color palette
const COLOR_PALETTE = [
  { hex: "#FFFFFF", name: "White" },
  { hex: "#F4E409", name: "Yellow" },
  { hex: "#FF2A6D", name: "Hot Pink" },
  { hex: "#05D9E8", name: "Cyan" },
  { hex: "#FF7A1A", name: "Ember" },
  { hex: "#2EC4B6", name: "Mint" },
  { hex: "#9B5DE5", name: "Purple" },
  { hex: "#FF4D3D", name: "Red" },
  { hex: "#000000", name: "Black" },
];

// Background Styles
const BG_STYLES: { id: TextOverlay["bgStyle"]; label: string }[] = [
  { id: "none", label: "Transparent" },
  { id: "solid", label: "Solid" },
  { id: "semi", label: "Translucent" },
  { id: "outline", label: "Outline" },
];

// ---------------------------------------------------------------------------
// Embedded props — when EditorScreen is rendered inline inside SnapCamera
// instead of as a standalone route, all data comes through this interface.
// ---------------------------------------------------------------------------
export interface EditorEmbeddedProps {
  capturedImage: string;
  selectedTemplateFamily: TemplateFamily | null;
  selectedLensId: string | undefined;
  lensFilter: string;
  statData: StatData;
  statLayout: TemplateLayout;
  appliedMusic: string | null;
  aspectRatio: string;
  onExit: () => void;
}

interface EditorScreenProps {
  embeddedProps?: EditorEmbeddedProps;
}

export default function EditorScreen({ embeddedProps }: EditorScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Image source captured from camera or gallery.
  // When embedded, use embeddedProps; otherwise fall back to sessionStorage
  // + router state + stock default.
  const capturedImage =
    embeddedProps?.capturedImage ??
    sessionStorage.getItem("temp_captured_image") ??
    (location.state?.capturedImage as string | undefined) ??
    STOCK_PHOTOS[0].url;

  // Selected template family, carried over from the camera
  const selectedTemplateFamily: TemplateFamily | null =
    embeddedProps?.selectedTemplateFamily ??
    (location.state?.selectedTemplateFamily as TemplateFamily | null) ??
    null;
  // Selected lens, carried over from the camera viewfinder
  const selectedLensId: string | undefined =
    embeddedProps?.selectedLensId ??
    (location.state?.selectedLensId as string | undefined);

  // Lens filter (CSS filter string) carried over from the camera — the base
  // image shows this filter so lens effects are editable in the editor.
  const cameraLensFilter: string =
    embeddedProps?.lensFilter ??
    (location.state?.lensFilter as string) ??
    "";
  const [lensFilter, setLensFilter] = useState<string>(cameraLensFilter);

  // Filter picker
  const [isFilterPickerOpen, setIsFilterPickerOpen] = useState<boolean>(false);
  const [filterIntensity, setFilterIntensity] = useState<number>(85);
  // Editor state, not a derived constant: undo has to be able to restore it.
  const [templateId, setTemplateId] = useState<string>(
    selectedTemplateFamily?.id ?? "default"
  );

  // Stat data and slot positions handed over from the camera. The layout the
  // user arranged there is the starting point here.
  const routeStatData = {
    distance: parseFloat((location.state?.activityDistance as string) ?? "") || 8.4,
    distanceUnit: "km",
    pace: ((location.state?.activityPace as string) ?? "6:12 /km").replace(" /km", ""),
    time: (location.state?.activityTime as string) ?? "52:18",
    title: (location.state?.activityTitle as string) ?? "Morning Run",
  };
  const statData: StatData = embeddedProps?.statData ?? routeStatData;

  const [statLayout, setStatLayout] = useState<TemplateLayout>(
    () =>
      embeddedProps?.statLayout ??
      (location.state?.statLayout as TemplateLayout | undefined) ??
      resolveLayout(templateId, loadCustomLayouts())
  );
  // Auto-opens once so the strip teaches that stats are tappable, then never
  // again. Any later tap on a stat brings it back.
  const [selectedStatSlot, setSelectedStatSlot] = useState<StatSlotId | null>(() =>
    shouldAutoOpenStrip(Boolean(selectedTemplateFamily ?? null)) ? "distance" : null
  );

  // Alignment guides shown only while a drag is snapped.
  const [snapGuides, setSnapGuides] = useState<SnapLine[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const captureCanvasSize = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setCanvasSize({ width: rect.width, height: rect.height });
  };

  useEffect(() => {
    if (selectedStatSlot) markStripSeen();
  }, [selectedStatSlot]);

  // Switching template re-skins the stats and restores whatever arrangement
  // that template was last given, matching the camera.
  const handleSelectTemplate = (template: TemplateFamily) => {
    if (template.id === templateId) return;
    pushHistorySnapshot();
    setTemplateId(template.id);
    setStatLayout(resolveLayout(template.id, loadCustomLayouts()));
    setSelectedStatSlot((prev) => (prev && prev !== "accent" ? prev : "distance"));
  };

  const handleStatLayoutChange = (next: TemplateLayout) => {
    setStatLayout(next);
    const updated = storeCustomLayout(loadCustomLayouts(), templateId, next);
    saveCustomLayouts(updated);
  };

  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Text Overlays state — starts empty. Users add text manually via the Text tool.
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Sticker Overlays state
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // Sticker Picker Modal state
  const [isStickerModalOpen, setIsStickerModalOpen] = useState<boolean>(false);
  const [stickerSearch, setStickerSearch] = useState<string>("");
  const [selectedStickerCategory, setSelectedStickerCategory] = useState<string>("All");

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Image Layer Selection, Perspective & Shadow State
  const [isImageSelected, setIsImageSelected] = useState<boolean>(false);
  const [imageSubTab, setImageSubTab] = useState<"crop" | "perspective" | "shadow">("crop");
  const [imagePerspectiveX, setImagePerspectiveX] = useState<number>(0); // -45 to 45 deg
  const [imagePerspectiveY, setImagePerspectiveY] = useState<number>(0); // -45 to 45 deg
  const [imageShadowBlur, setImageShadowBlur] = useState<number>(0); // 0 to 50 px
  const [imageShadowOffsetY, setImageShadowOffsetY] = useState<number>(10); // 0 to 30 px
  const [imageShadowColor, setImageShadowColor] = useState<string>("#000000");

  // Text Editor modal state
  const [isEditingText, setIsEditingText] = useState<boolean>(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState<string>("");
  const [selectedFont, setSelectedFont] = useState<TextOverlay["fontStyle"]>("Bold");
  const [selectedColor, setSelectedColor] = useState<string>("#FFFFFF");
  const [selectedBgStyle, setSelectedBgStyle] = useState<TextOverlay["bgStyle"]>("solid");
  const [selectedAlign, setSelectedAlign] = useState<TextOverlay["align"]>("center");
  const [selectedFontSize, setSelectedFontSize] = useState<number>(32);

  // Unified Editor Snapshot interface for full Undo/Redo history
  interface EditorSnapshot {
    textOverlays: TextOverlay[];
    stickerOverlays: StickerOverlay[];
    templateId: string;
    statLayout: TemplateLayout;
    committedCrop: {
      ratio: string;
      rotation: number;
      flipH: boolean;
      flipV: boolean;
    };
    isBaseImageHidden: boolean;
    isBaseImageLocked: boolean;
    baseImageZIndex: number;
    imagePerspectiveX: number;
    imagePerspectiveY: number;
    imageShadowBlur: number;
    imageShadowOffsetY: number;
    imageShadowColor: string;
    isDrawingHidden: boolean;
    isDrawingLocked: boolean;
    drawingZIndex: number;
    drawingCanvasDataUrl?: string | null;
    hasDrawnStrokes: boolean;
  }

  // Drawing Tool State
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [brushType, setBrushType] = useState<"pen" | "neon" | "highlighter" | "eraser">("pen");
  const [brushColor, setBrushColor] = useState<string>("#FF7A1A"); // Ember
  const [brushSize, setBrushSize] = useState<number>(8); // In px
  const [historyStack, setHistoryStack] = useState<EditorSnapshot[]>([]);
  const [redoHistoryStack, setRedoHistoryStack] = useState<EditorSnapshot[]>([]);
  const [hasDrawnStrokes, setHasDrawnStrokes] = useState<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Helper to snapshot current canvas & editor state
  // Uses compressed data URL instead of raw ImageData (~8MB → ~200KB per snapshot)
  const getCurrentSnapshot = (): EditorSnapshot => {
    let drawingDataUrl: string | null = null;
    const canvas = drawingCanvasRef.current;
    if (canvas && canvas.width > 0 && canvas.height > 0 && hasDrawnStrokes) {
      try {
        drawingDataUrl = canvas.toDataURL("image/png");
      } catch {
        // ignore
      }
    }

    return {
      textOverlays: JSON.parse(JSON.stringify(textOverlays)),
      stickerOverlays: JSON.parse(JSON.stringify(stickerOverlays)),
      templateId,
      statLayout: JSON.parse(JSON.stringify(statLayout)),
      committedCrop: { ...committedCrop },
      isBaseImageHidden,
      isBaseImageLocked,
      baseImageZIndex,
      imagePerspectiveX,
      imagePerspectiveY,
      imageShadowBlur,
      imageShadowOffsetY,
      imageShadowColor,
      isDrawingHidden,
      isDrawingLocked,
      drawingZIndex,
      drawingCanvasDataUrl: drawingDataUrl,
      hasDrawnStrokes,
    };
  };

  // Push snapshot before making any state mutation
  const pushHistorySnapshot = () => {
    const snapshot = getCurrentSnapshot();
    setHistoryStack((prev) => [...prev.slice(-14), snapshot]); // Store up to 15 history states
    setRedoHistoryStack([]); // Clear redo stack on new action
  };

  // Restore snapshot state
  const applySnapshot = (snapshot: EditorSnapshot) => {
    setTextOverlays(snapshot.textOverlays);
    setStickerOverlays(snapshot.stickerOverlays);
    // Snapshots taken before stats were tracked carry neither field.
    if (snapshot.templateId) setTemplateId(snapshot.templateId);
    if (snapshot.statLayout) setStatLayout(snapshot.statLayout);
    setCommittedCrop(snapshot.committedCrop);
    setIsBaseImageHidden(snapshot.isBaseImageHidden);
    setIsBaseImageLocked(snapshot.isBaseImageLocked);
    setBaseImageZIndex(snapshot.baseImageZIndex);
    setImagePerspectiveX(snapshot.imagePerspectiveX ?? 0);
    setImagePerspectiveY(snapshot.imagePerspectiveY ?? 0);
    setImageShadowBlur(snapshot.imageShadowBlur ?? 0);
    setImageShadowOffsetY(snapshot.imageShadowOffsetY ?? 10);
    setImageShadowColor(snapshot.imageShadowColor ?? "#000000");
    setIsDrawingHidden(snapshot.isDrawingHidden);
    setIsDrawingLocked(snapshot.isDrawingLocked);
    setDrawingZIndex(snapshot.drawingZIndex);
    setHasDrawnStrokes(snapshot.hasDrawnStrokes);

    // Restore drawing canvas from compressed data URL
    const canvas = drawingCanvasRef.current;
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (snapshot.drawingCanvasDataUrl) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = snapshot.drawingCanvasDataUrl;
        }
      }
    }
  };

  // Global Undo Handler
  const handleGlobalUndo = () => {
    if (historyStack.length === 0) return;
    const currentSnapshot = getCurrentSnapshot();
    const previousSnapshot = historyStack[historyStack.length - 1];

    setHistoryStack((prev) => prev.slice(0, -1));
    setRedoHistoryStack((prev) => [...prev, currentSnapshot]);

    applySnapshot(previousSnapshot);
    showToast("Undo applied");
  };

  // Global Redo Handler
  const handleGlobalRedo = () => {
    if (redoHistoryStack.length === 0) return;
    const currentSnapshot = getCurrentSnapshot();
    const nextSnapshot = redoHistoryStack[redoHistoryStack.length - 1];

    setRedoHistoryStack((prev) => prev.slice(0, -1));
    setHistoryStack((prev) => [...prev, currentSnapshot]);

    applySnapshot(nextSnapshot);
    showToast("Redo applied");
  };

  // Crop & Orientation Tool State
  const [cropRatio, setCropRatio] = useState<string>("free"); // "free", "9:16", "1:1", "4:5", "16:9"
  const [cropRotation, setCropRotation] = useState<number>(0);
  const [cropFlipH, setCropFlipH] = useState<boolean>(false);
  const [cropFlipV, setCropFlipV] = useState<boolean>(false);

  const [committedCrop, setCommittedCrop] = useState<{
    ratio: string;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
  }>({
    ratio: "free",
    rotation: 0,
    flipH: false,
    flipV: false,
  });

  // Layer Manager States
  const [isBaseImageHidden, setIsBaseImageHidden] = useState<boolean>(false);
  const [isBaseImageLocked, setIsBaseImageLocked] = useState<boolean>(false);
  const [baseImageZIndex, setBaseImageZIndex] = useState<number>(0);

  const [isDrawingHidden, setIsDrawingHidden] = useState<boolean>(false);
  const [isDrawingLocked, setIsDrawingLocked] = useState<boolean>(false);
  const [drawingZIndex, setDrawingZIndex] = useState<number>(15);

  // Global Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleGlobalRedo();
        } else {
          handleGlobalUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleGlobalRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyStack, redoHistoryStack, textOverlays, stickerOverlays, committedCrop, isBaseImageHidden, isBaseImageLocked, baseImageZIndex, isDrawingHidden, isDrawingLocked, drawingZIndex, hasDrawnStrokes]);

  // Get list of all active layers sorted by zIndex descending (topmost first)
  const getAllLayers = () => {
    const items = [
      {
        id: "layer_base_image",
        type: "image" as const,
        name: "Background Photo",
        subtext: "Base captured photo",
        hidden: isBaseImageHidden,
        locked: isBaseImageLocked,
        zIndex: baseImageZIndex,
      },
      ...(hasDrawnStrokes
        ? [
            {
              id: "layer_draw",
              type: "draw" as const,
              name: "Drawn Strokes",
              subtext: "Pen & glow brush strokes",
              hidden: isDrawingHidden,
              locked: isDrawingLocked,
              zIndex: drawingZIndex,
            },
          ]
        : []),
      ...textOverlays.map((t, idx) => ({
        id: t.id,
        type: "text" as const,
        name: `Text: "${t.text.length > 18 ? t.text.slice(0, 18) + "..." : t.text}"`,
        subtext: `${t.fontStyle} • ${t.fontSize}px`,
        hidden: !!t.hidden,
        locked: !!t.locked,
        zIndex: t.zIndex ?? (20 + idx),
      })),
      ...stickerOverlays.map((s, idx) => ({
        id: s.id,
        type: "sticker" as const,
        name: `Sticker: ${s.content}`,
        subtext: `${s.type} badge`,
        hidden: !!s.hidden,
        locked: !!s.locked,
        zIndex: s.zIndex ?? (30 + idx),
      })),
    ];

    return items.sort((a, b) => b.zIndex - a.zIndex);
  };

  // Toggle Visibility
  const toggleLayerVisibility = (id: string, type: string) => {
    pushHistorySnapshot();
    if (type === "image") {
      setIsBaseImageHidden((prev) => !prev);
    } else if (type === "draw") {
      setIsDrawingHidden((prev) => !prev);
    } else if (type === "text") {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === id ? { ...t, hidden: !t.hidden } : t))
      );
    } else if (type === "sticker") {
      setStickerOverlays((prev) =>
        prev.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s))
      );
    }
  };

  // Toggle Lock
  const toggleLayerLock = (id: string, type: string) => {
    pushHistorySnapshot();
    if (type === "image") {
      setIsBaseImageLocked((prev) => !prev);
    } else if (type === "draw") {
      setIsDrawingLocked((prev) => !prev);
    } else if (type === "text") {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === id ? { ...t, locked: !t.locked } : t))
      );
    } else if (type === "sticker") {
      setStickerOverlays((prev) =>
        prev.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s))
      );
    }
  };

  // Reorder Layer: Swap zIndex with target layer up/down in stack
  const reorderLayer = (id: string, direction: "up" | "down") => {
    const sorted = getAllLayers(); // sorted top (highest zIndex) to bottom
    const currentIndex = sorted.findIndex((item) => item.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    pushHistorySnapshot();

    const currentLayer = sorted[currentIndex];
    const targetLayer = sorted[targetIndex];

    const currentZ = currentLayer.zIndex;
    const targetZ = targetLayer.zIndex;

    // Helper to update zIndex for a layer
    const setLayerZ = (layerId: string, layerType: string, newZ: number) => {
      if (layerType === "image") setBaseImageZIndex(newZ);
      else if (layerType === "draw") setDrawingZIndex(newZ);
      else if (layerType === "text") {
        setTextOverlays((prev) =>
          prev.map((t) => (t.id === layerId ? { ...t, zIndex: newZ } : t))
        );
      } else if (layerType === "sticker") {
        setStickerOverlays((prev) =>
          prev.map((s) => (s.id === layerId ? { ...s, zIndex: newZ } : s))
        );
      }
    };

    setLayerZ(currentLayer.id, currentLayer.type, targetZ);
    setLayerZ(targetLayer.id, targetLayer.type, currentZ);
    showToast(`Layer moved ${direction}`);
  };

  // Duplicate Layer
  const duplicateLayer = (id: string, type: string) => {
    pushHistorySnapshot();
    if (type === "text") {
      const original = textOverlays.find((t) => t.id === id);
      if (!original) return;
      const dup: TextOverlay = {
        ...original,
        id: `text_${Date.now()}`,
        x: original.x + 20,
        y: original.y + 20,
        zIndex: (original.zIndex ?? 20) + 1,
      };
      setTextOverlays((prev) => [...prev, dup]);
      setSelectedTextId(dup.id);
      showToast("Text layer duplicated");
    } else if (type === "sticker") {
      const original = stickerOverlays.find((s) => s.id === id);
      if (!original) return;
      const dup: StickerOverlay = {
        ...original,
        id: `sticker_${Date.now()}`,
        x: original.x + 20,
        y: original.y + 20,
        zIndex: (original.zIndex ?? 30) + 1,
      };
      setStickerOverlays((prev) => [...prev, dup]);
      setSelectedStickerId(dup.id);
      showToast("Sticker layer duplicated");
    }
  };

  // Delete Layer
  const deleteLayerItem = (id: string, type: string) => {
    if (type === "text") {
      handleDeleteText(id);
    } else if (type === "sticker") {
      handleDeleteSticker(id);
    } else if (type === "draw") {
      handleClearDraw();
      showToast("Drawing layer cleared");
    } else if (type === "image") {
      showToast("Cannot delete base image");
    }
  };

  // Select Layer
  const handleSelectLayer = (id: string, type: string) => {
    if (type === "text") {
      setSelectedTextId(id);
      setSelectedStickerId(null);
    } else if (type === "sticker") {
      setSelectedStickerId(id);
      setSelectedTextId(null);
    } else if (type === "draw") {
      setActiveTool("draw");
    } else if (type === "image") {
      setActiveTool("crop");
    }
  };

  // Resize listener for drawing canvas
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const ctx = canvas.getContext("2d");
      let tempImageData: ImageData | null = null;
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        try {
          tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch {
          // ignore
        }
      }

      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      if (ctx && tempImageData) {
        ctx.putImageData(tempImageData, 0, 0);
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Save current canvas state to undo stack
  const saveCanvasState = () => {
    pushHistorySnapshot();
    setHasDrawnStrokes(true);
  };

  // Apply current brush settings to 2D context
  const applyBrushStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;

    if (brushType === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1.0;
    } else if (brushType === "neon") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#FFFFFF"; // bright white center
      ctx.shadowColor = brushColor;
      ctx.shadowBlur = brushSize * 2.5;
      ctx.globalAlpha = 1.0;
    } else if (brushType === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 0.45;
    } else {
      // Standard pen
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1.0;
    }
  };

  // Start stroke
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== "draw" || isDrawingLocked || isDrawingHidden) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    pushHistorySnapshot();
    setIsDrawing(true);
    setHasDrawnStrokes(true);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPointRef.current = { x, y };

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    applyBrushStyle(ctx);
    ctx.stroke();
  };

  // Draw stroke
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== "draw") return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      applyBrushStyle(ctx);
      ctx.stroke();
    }

    lastPointRef.current = { x, y };
  };

  // Stop stroke
  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  // Clear draw canvas
  const handleClearDraw = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    pushHistorySnapshot();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnStrokes(false);
    showToast("Drawing cleared");
  };

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  // Add Sticker to canvas
  const handleAddSticker = (item: StickerItem) => {
    pushHistorySnapshot();
    // Interpolate stat data if this sticker references a stat
    let stickerContent = item.content;
    if (item.statKey) {
      const statValue = statData[item.statKey as keyof StatData];
      if (statValue !== undefined && statValue !== null) {
        stickerContent = String(statValue).toUpperCase();
        if (item.statKey === "distance") stickerContent += " KM";
        if (item.statKey === "pace") stickerContent += " /KM";
        if (item.statKey === "time") stickerContent += "";
      }
    }
    const newSticker: StickerOverlay = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      content: stickerContent,
      type: item.type,
      scale: 1.0,
      rotation: 0,
      x: 0,
      y: 0,
      bgGradient: item.bgGradient,
    };
    setStickerOverlays((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
    setSelectedTextId(null);
    setIsStickerModalOpen(false);
    showToast(`Added ${item.label}`);
  };

  // Delete Sticker
  const handleDeleteSticker = (id: string) => {
    pushHistorySnapshot();
    setStickerOverlays((prev) => prev.filter((s) => s.id !== id));
    if (selectedStickerId === id) {
      setSelectedStickerId(null);
    }
    showToast("Sticker removed");
  };

  // Open Text Editor for creating new text or editing existing text
  const openTextEditor = (existingOverlay?: TextOverlay) => {
    if (existingOverlay) {
      setEditingTextId(existingOverlay.id);
      setCurrentText(existingOverlay.text);
      setSelectedFont(existingOverlay.fontStyle);
      setSelectedColor(existingOverlay.color);
      setSelectedBgStyle(existingOverlay.bgStyle);
      setSelectedAlign(existingOverlay.align);
      setSelectedFontSize(existingOverlay.fontSize);
    } else {
      setEditingTextId(null);
      setCurrentText("");
      setSelectedFont("Bold");
      setSelectedColor("#FFFFFF");
      setSelectedBgStyle("solid");
      setSelectedAlign("center");
      setSelectedFontSize(32);
    }
    setIsEditingText(true);
    setActiveTool("text");
  };

  // Save text overlay
  const handleSaveText = () => {
    pushHistorySnapshot();
    if (!currentText.trim()) {
      // If text is empty, remove existing if editing, or cancel
      if (editingTextId) {
        setTextOverlays((prev) => prev.filter((item) => item.id !== editingTextId));
        showToast("Text removed");
      }
      setIsEditingText(false);
      return;
    }

    if (editingTextId) {
      // Update existing
      setTextOverlays((prev) =>
        prev.map((item) =>
          item.id === editingTextId
            ? {
                ...item,
                text: currentText,
                fontStyle: selectedFont,
                color: selectedColor,
                bgStyle: selectedBgStyle,
                align: selectedAlign,
                fontSize: selectedFontSize,
              }
            : item
        )
      );
      showToast("Text updated");
    } else {
      // Create new text overlay centered
      const newOverlay: TextOverlay = {
        id: `text_${Date.now()}`,
        text: currentText,
        x: 0,
        y: 0,
        color: selectedColor,
        fontStyle: selectedFont,
        bgStyle: selectedBgStyle,
        align: selectedAlign,
        fontSize: selectedFontSize,
      };
      setTextOverlays((prev) => [...prev, newOverlay]);
      setSelectedTextId(newOverlay.id);
      showToast("Text added");
    }

    setIsEditingText(false);
  };

  // Delete text overlay
  const handleDeleteText = (id: string) => {
    pushHistorySnapshot();
    setTextOverlays((prev) => prev.filter((item) => item.id !== id));
    if (editingTextId === id) {
      setIsEditingText(false);
    }
    if (selectedTextId === id) {
      setSelectedTextId(null);
    }
    showToast("Text deleted");
  };

  // Floating toolbar tools list (only implemented features)
  const tools = [
    { id: "layers", label: "Layers", icon: Layers },
    { id: "text", label: "Text", icon: Type },
    { id: "draw", label: "Draw", icon: PenTool },
    { id: "stickers", label: "Stickers", icon: StickyNote },
    { id: "crop", label: "Crop", icon: Crop },
    { id: "filters", label: "Filter", icon: Sparkles },
  ];

  const handleToolClick = (toolId: string) => {
    if (toolId === "layers") {
      setActiveTool(activeTool === "layers" ? null : "layers");
      showToast(activeTool === "layers" ? "Layers closed" : "Layer Manager opened");
    } else if (toolId === "text") {
      openTextEditor();
    } else if (toolId === "stickers") {
      setIsStickerModalOpen(true);
      setActiveTool("stickers");
    } else if (toolId === "crop") {
      setCropRatio(committedCrop.ratio);
      setCropRotation(committedCrop.rotation);
      setCropFlipH(committedCrop.flipH);
      setCropFlipV(committedCrop.flipV);
      setActiveTool(activeTool === "crop" ? null : "crop");
      showToast(activeTool === "crop" ? "Crop tool closed" : "Crop & Perspective active");
    } else if (toolId === "draw") {
      setActiveTool(activeTool === "draw" ? null : "draw");
      showToast(activeTool === "draw" ? "Drawing mode closed" : "Drawing mode active");
    } else if (toolId === "filters") {
      setIsFilterPickerOpen(true);
      setActiveTool("filters");
    }
  };

  // Filtered stickers for the picker modal
  const filteredStickers = STICKER_LIBRARY.filter((item) => {
    const matchesCategory =
      selectedStickerCategory === "All" || item.category === selectedStickerCategory;
    const matchesSearch =
      !stickerSearch.trim() ||
      item.label.toLowerCase().includes(stickerSearch.toLowerCase()) ||
      item.content.toLowerCase().includes(stickerSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Helper function to get text styling classes/styles
  const getTextCssStyles = (
    color: string,
    bgStyle: TextOverlay["bgStyle"],
    fontSize: number
  ) => {
    let bgCss = "";
    let textCss = "";
    let borderCss = "";

    if (bgStyle === "solid") {
      if (color.toLowerCase() === "#ffffff") {
        bgCss = "bg-white text-black px-3.5 py-1.5 rounded-lg shadow-xl";
        textCss = "text-black";
      } else {
        bgCss = "px-3.5 py-1.5 rounded-lg shadow-xl";
        textCss = "text-white";
      }
    } else if (bgStyle === "semi") {
      bgCss = "bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg shadow-lg";
    } else if (bgStyle === "outline") {
      bgCss = "px-3.5 py-1.5 rounded-lg border-2 border-white/80 bg-black/40";
    } else {
      bgCss = "px-1 py-0.5";
    }

    return { bgCss, textCss, borderCss, fontSizeStyle: { fontSize: `${fontSize}px` } };
  };

  // Effective crop values (draft when tool is active, committed when done)
  const currentRotation = activeTool === "crop" ? cropRotation : committedCrop.rotation;
  const currentFlipH = activeTool === "crop" ? cropFlipH : committedCrop.flipH;
  const currentFlipV = activeTool === "crop" ? cropFlipV : committedCrop.flipV;
  const currentRatio = activeTool === "crop" ? cropRatio : committedCrop.ratio;

  const getAspectRatioContainerStyle = (ratio: string): React.CSSProperties => {
    switch (ratio) {
      case "1:1":
        return { aspectRatio: "1 / 1", maxHeight: "82vh", maxWidth: "82vw" };
      case "9:16":
        return { aspectRatio: "9 / 16", maxHeight: "88vh", maxWidth: "88vw" };
      case "4:5":
        return { aspectRatio: "4 / 5", maxHeight: "82vh", maxWidth: "82vw" };
      case "16:9":
        return { aspectRatio: "16 / 9", maxHeight: "70vh", maxWidth: "92vw" };
      default:
        return { width: "100%", height: "100%" };
    }
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden flex flex-col justify-between select-none">
      {/* 1. FULL-SCREEN CANVAS DISPLAYING CAPTURED IMAGE & OVERLAYS */}
      <div
        ref={canvasRef}
        onClick={() => {
          setSelectedTextId(null);
          setSelectedStickerId(null);
          setIsImageSelected(false);
          setSelectedStatSlot(null);
        }}
        className="absolute inset-0 z-0 bg-neutral-950 flex items-center justify-center overflow-hidden"
      >
        {/* IMAGE CONTAINER WITH ASPECT RATIO, 3D PERSPECTIVE & SHADOW */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isBaseImageLocked) {
              showToast("Image layer is locked");
              return;
            }
            setIsImageSelected(true);
            setSelectedTextId(null);
            setSelectedStickerId(null);
            setSelectedStatSlot(null);
          }}
          className={`relative transition-all duration-300 flex items-center justify-center ${
            currentRatio !== "free" ? "rounded-2xl shadow-2xl border border-white/20 overflow-hidden" : "w-full h-full"
          } ${isBaseImageHidden ? "opacity-0 pointer-events-none" : "opacity-100"} ${
            isImageSelected ? "ring-2 ring-blue-500 ring-offset-4 ring-offset-black/90 shadow-[0_0_20px_rgba(59,130,246,0.6)]" : ""
          }`}
          style={{
            ...getAspectRatioContainerStyle(currentRatio),
            transform: `perspective(800px) rotateX(${imagePerspectiveY}deg) rotateY(${imagePerspectiveX}deg)`,
            filter: imageShadowBlur > 0 ? `drop-shadow(0px ${imageShadowOffsetY}px ${imageShadowBlur}px ${imageShadowColor})` : "none",
            zIndex: baseImageZIndex,
          }}
        >
          {/* Blue Corner Handles for Image when Selected */}
          {isImageSelected && (
            <>
              <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full z-30 shadow-md" />
              <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full z-30 shadow-md" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full z-30 shadow-md" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full z-30 shadow-md" />
            </>
          )}

          <img
            src={capturedImage}
            alt="Captured preview"
            style={{
              transform: `rotate(${currentRotation}deg) scaleX(${currentFlipH ? -1 : 1}) scaleY(${
                currentFlipV ? -1 : 1
              })`,
              filter: lensFilter || undefined,
              transition: "transform 0.3s ease, filter 0.4s ease",
            }}
            className="w-full h-full object-cover select-none pointer-events-none"
          />

          {/* CROP OVERLAY GRID (Rule of Thirds + Corner Handles) */}
          {activeTool === "crop" && (
            <div className="absolute inset-0 pointer-events-none z-20 border-2 border-ember shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] rounded-2xl">
              {/* 3x3 Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-white/40" />
                <div className="border-r border-white/40" />
                <div className="" />
              </div>

              {/* Corner Accent Handles */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-ember rounded-tl-md" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-ember rounded-tr-md" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-ember rounded-bl-md" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-ember rounded-br-md" />
            </div>
          )}
        </div>

        {/* DRAGGABLE TEMPLATE STATS — sit under user-added text overlays */}
        <StatLayer
          templateId={templateId}
          data={statData}
          layout={statLayout}
          onLayoutChange={handleStatLayoutChange}
          constraintsRef={canvasRef}
          selectedSlot={selectedStatSlot}
          onSelectSlot={(slot) => {
            setSelectedStatSlot(slot);
            setSelectedTextId(null);
            setSelectedStickerId(null);
            setIsImageSelected(false);
          }}
          onDragStart={() => {
            captureCanvasSize();
            pushHistorySnapshot();
          }}
          onGuidesChange={setSnapGuides}
          onSnap={() => triggerHaptic("snap")}
        />

        <SnapGuides guides={snapGuides} canvas={canvasSize} />

        {/* CONTEXTUAL STAT TOOLBAR — template switching for the tapped stat */}
        <AnimatePresence>
          {selectedStatSlot && statLayout[selectedStatSlot] && (
            <StatToolbar
              templates={TEMPLATE_FAMILIES}
              selectedTemplateId={templateId}
              onSelectTemplate={handleSelectTemplate}
              slotY={statLayout[selectedStatSlot]!.y}
              selectedSlot={selectedStatSlot}
              onClose={() => setSelectedStatSlot(null)}
            />
          )}
        </AnimatePresence>

        {/* DRAGGABLE TEXT OVERLAYS ON CANVAS */}
        {textOverlays.map((overlay) => {
          if (overlay.hidden) return null;
          const fontConfig =
            FONT_STYLES.find((f) => f.id === overlay.fontStyle) || FONT_STYLES[0];
          const isSelected = selectedTextId === overlay.id;

          const isSolidBg = overlay.bgStyle === "solid";
          const isSemiBg = overlay.bgStyle === "semi";
          const isOutlineBg = overlay.bgStyle === "outline";

          return (
            <DraggableLayer
              key={overlay.id}
              draggable={!overlay.locked}
              constraintsRef={canvasRef}
              onDragStart={() => {
                captureCanvasSize();
                pushHistorySnapshot();
              }}
              onGuidesChange={setSnapGuides}
              onSnap={() => triggerHaptic("snap")}
              onClick={(e) => {
                e.stopPropagation();
                if (overlay.locked) {
                  showToast("Layer is locked");
                  return;
                }
                setSelectedTextId(overlay.id);
                setSelectedStickerId(null);
                setIsImageSelected(false);
                setSelectedStatSlot(null);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!overlay.locked) {
                  openTextEditor(overlay);
                }
              }}
              onCommit={(next) => {
                setTextOverlays((prev) =>
                  prev.map((t) => (t.id === overlay.id ? { ...t, ...next } : t))
                );
              }}
              x={overlay.x}
              y={overlay.y}
              rotate={overlay.rotation || 0}
              scale={overlay.scale || 1}
              zIndex={overlay.zIndex ?? 20}
              className={`absolute touch-none flex items-center group transition-all ${
                overlay.locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
              } ${
                isSelected
                  ? "p-2 border-2 border-blue-500 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.6)] relative z-30"
                  : "p-1"
              }`}
            >
              {/* Blue Corner Handles for Selected Text */}
              {isSelected && (
                <>
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full z-30" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full z-30" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full z-30" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full z-30" />
                </>
              )}

              <div
                style={{
                  color: isSolidBg && overlay.color.toLowerCase() === "#ffffff" ? "#000000" : overlay.color,
                  backgroundColor: isSolidBg
                    ? overlay.color.toLowerCase() === "#ffffff"
                      ? "#FFFFFF"
                      : overlay.color
                    : isSemiBg
                    ? "rgba(0, 0, 0, 0.65)"
                    : "transparent",
                  fontSize: `${overlay.fontSize}px`,
                  textAlign: overlay.align,
                }}
                className={`max-w-[85vw] whitespace-pre-wrap break-words transition-all ${
                  fontConfig.className
                } ${
                  isSolidBg || isSemiBg ? "px-4 py-2 rounded-xl shadow-2xl" : "px-2 py-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                } ${isOutlineBg ? "border-2 border-white/90 rounded-xl bg-black/40 backdrop-blur-xs" : ""}`}
              >
                {overlay.text}
              </div>

              {/* Text Layer Floating Blue Action Toolbar */}
              {isSelected && !overlay.locked && (
                <motion.div
                  initial={{ scale: 0, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur-md text-white border border-blue-400/50 rounded-full px-2 py-1 flex items-center gap-1.5 shadow-2xl z-40 whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openTextEditor(overlay)}
                    className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="Edit Text"
                  >
                    <Type className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      pushHistorySnapshot();
                      setTextOverlays((prev) =>
                        prev.map((t) =>
                          t.id === overlay.id ? { ...t, rotation: ((t.rotation || 0) + 15) % 360 } : t
                        )
                      );
                    }}
                    className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="Rotate (+15°)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      pushHistorySnapshot();
                      setTextOverlays((prev) =>
                        prev.map((t) =>
                          t.id === overlay.id ? { ...t, fontSize: Math.max(14, t.fontSize - 4) } : t
                        )
                      );
                    }}
                    className="px-1.5 py-0.5 hover:bg-white/20 rounded-full text-white font-bold transition-colors text-[11px]"
                    title="Scale Down"
                  >
                    A-
                  </button>

                  <button
                    onClick={() => {
                      pushHistorySnapshot();
                      setTextOverlays((prev) =>
                        prev.map((t) =>
                          t.id === overlay.id ? { ...t, fontSize: Math.min(120, t.fontSize + 4) } : t
                        )
                      );
                    }}
                    className="px-1.5 py-0.5 hover:bg-white/20 rounded-full text-white font-bold transition-colors text-[11px]"
                    title="Scale Up"
                  >
                    A+
                  </button>

                  <button
                    onClick={() => duplicateLayer(overlay.id, "text")}
                    className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="Duplicate Text Layer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteText(overlay.id)}
                    className="p-1 hover:bg-rose-500/80 rounded-full text-rose-200 hover:text-white transition-colors"
                    title="Delete Text Layer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </DraggableLayer>
          );
        })}

        {/* DRAGGABLE STICKER OVERLAYS ON CANVAS */}
        {stickerOverlays.map((sticker) => {
          if (sticker.hidden) return null;
          const isSelected = selectedStickerId === sticker.id;
          return (
            <DraggableLayer
              key={sticker.id}
              draggable={!sticker.locked}
              constraintsRef={canvasRef}
              onDragStart={() => {
                captureCanvasSize();
                pushHistorySnapshot();
              }}
              onGuidesChange={setSnapGuides}
              onSnap={() => triggerHaptic("snap")}
              onClick={(e) => {
                e.stopPropagation();
                if (sticker.locked) {
                  showToast("Layer is locked");
                  return;
                }
                setSelectedStickerId(sticker.id);
                setSelectedTextId(null);
                setIsImageSelected(false);
                setSelectedStatSlot(null);
              }}
              onCommit={(next) => {
                setStickerOverlays((prev) =>
                  prev.map((s) => (s.id === sticker.id ? { ...s, ...next } : s))
                );
              }}
              x={sticker.x}
              y={sticker.y}
              rotate={sticker.rotation}
              scale={sticker.scale}
              zIndex={sticker.zIndex ?? 30}
              className={`absolute touch-none flex items-center justify-center p-2 rounded-2xl transition-all ${
                sticker.locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
              } ${
                isSelected
                  ? "border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] bg-black/30 backdrop-blur-xs relative z-30"
                  : ""
              }`}
            >
              {/* Blue Corner Handles for Selected Sticker */}
              {isSelected && (
                <>
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full z-30" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full z-30" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full z-30" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full z-30" />
                </>
              )}

              <div
                className={`px-4 py-2 rounded-2xl bg-gradient-to-r ${
                  sticker.bgGradient || "from-amber-500 to-yellow-400"
                } text-white font-extrabold text-lg tracking-wider uppercase shadow-2xl border border-white/30 flex items-center gap-2 select-none`}
              >
                {sticker.content}
              </div>

              {/* Sticker Layer Floating Blue Action Toolbar */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur-md text-white border border-blue-400/50 rounded-full px-2 py-1 flex items-center gap-1.5 shadow-2xl z-40 whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      pushHistorySnapshot();
                      setStickerOverlays((prev) =>
                        prev.map((s) =>
                          s.id === sticker.id ? { ...s, rotation: (s.rotation + 15) % 360 } : s
                        )
                      );
                    }}
                    className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="Rotate (+15°)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      pushHistorySnapshot();
                      setStickerOverlays((prev) =>
                        prev.map((s) =>
                          s.id === sticker.id ? { ...s, scale: Math.max(0.4, Number((s.scale - 0.2).toFixed(1))) } : s
                        )
                      );
                    }}
                    className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="Scale Down"
                  >
                    <Maximize2 className="w-3.5 h-3.5 rotate-180" />
                  </button>

                  <button
                    onClick={() => {
                      pushHistorySnapshot();
                      setStickerOverlays((prev) =>
                        prev.map((s) =>
                          s.id === sticker.id ? { ...s, scale: Math.min(3.5, Number((s.scale + 0.2).toFixed(1))) } : s
                        )
                      );
                    }}
                    className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="Scale Up"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      pushHistorySnapshot();
                      setStickerOverlays((prev) =>
                        prev.map((s) =>
                          s.id === sticker.id ? { ...s, locked: !s.locked } : s
                        )
                      );
                      showToast(sticker.locked ? "Sticker unlocked" : "Sticker locked");
                    }}
                    className="p-1 hover:bg-white/20 rounded-full text-white/60 transition-colors"
                    title={sticker.locked ? "Unlock Sticker" : "Lock Sticker"}
                  >
                    {sticker.locked ? <Lock className="w-3.5 h-3.5 text-white" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => duplicateLayer(sticker.id, "sticker")}
                    className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="Duplicate Sticker Layer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteSticker(sticker.id)}
                    className="p-1 hover:bg-rose-500/80 rounded-full text-rose-200 hover:text-white transition-colors"
                    title="Delete Sticker Layer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </DraggableLayer>
          );
        })}

        {/* DRAWING CANVAS LAYER */}
        <canvas
          ref={drawingCanvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          style={{
            zIndex: drawingZIndex,
            opacity: isDrawingHidden ? 0 : 1,
          }}
          className={`absolute inset-0 touch-none ${
            activeTool === "draw" && !isDrawingLocked && !isDrawingHidden
              ? "cursor-crosshair pointer-events-auto"
              : "pointer-events-none"
          }`}
        />

        {/* Subtle dark gradient overlay for top/bottom bars legibility */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-0" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-0" />
      </div>

      {/* 2. TOP BAR */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-12 pb-3 w-full">
        {/* Close / Back to Camera */}
        <button
          onClick={() => embeddedProps?.onExit ? embeddedProps.onExit() : navigate("/home")}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
          aria-label="Close Editor"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Center Title or Indicator — shows active lens filter */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-semibold text-white/90">
          <span>Editor</span>
          {lensFilter && (
            <>
              <span className="w-[3px] h-[3px] rounded-full bg-white/30" />
              <span className="flex items-center gap-1 text-ember">
                <Sparkles className="w-3 h-3" />
                <span>
                  {LENS_TEMPLATES_EXPANDED.find(
                    (l) => LENS_FILTER_MAP[l.overlayType] === lensFilter
                  )?.name || "Filtered"}
                </span>
              </span>
            </>
          )}
        </div>

        {/* Right Actions: Undo, Redo, Save */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGlobalUndo}
            disabled={historyStack.length === 0}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-transform disabled:opacity-30"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleGlobalRedo}
            disabled={redoHistoryStack.length === 0}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-transform disabled:opacity-30"
            aria-label="Redo"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-transform"
            aria-label="Export / Save"
            title="Export / Save Creation"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. FLOATING TOOLBAR (RIGHT SIDE) */}
      <div className="absolute right-4 top-28 z-20 flex flex-col gap-3.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive =
            activeTool === tool.id ||
            (tool.id === "layers" && activeTool === "layers") ||
            (tool.id === "text" && textOverlays.length > 0) ||
            (tool.id === "draw" && (hasDrawnStrokes || activeTool === "draw")) ||
            (tool.id === "stickers" && (stickerOverlays.length > 0 || isStickerModalOpen)) ||
            (tool.id === "crop" &&
              (committedCrop.ratio !== "free" ||
                committedCrop.rotation !== 0 ||
                committedCrop.flipH ||
                committedCrop.flipV ||
                activeTool === "crop")) ||
            (tool.id === "filters" && (lensFilter !== "" || isFilterPickerOpen));
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`flex flex-col items-center gap-1 group relative transition-all duration-200 active:scale-90`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg relative ${
                  isActive
                    ? "bg-ember text-ink border-2 border-ember shadow-[0_0_20px_var(--color-ember-glow)] scale-105"
                    : "bg-black/60 text-white border border-white/20 hover:bg-black/80"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tool.id === "layers" && getAllLayers().length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ember text-ink text-[9px] font-black flex items-center justify-center border border-black shadow">
                    {getAllLayers().length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-white/90 drop-shadow-md">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* TOAST NOTIFICATION FOR TOOLS */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-xs text-white font-medium shadow-xl flex items-center gap-2"
          >
            <Info className="w-3.5 h-3.5 text-ember" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. FULL-SCREEN TEXT EDITOR OVERLAY MODAL */}
      <AnimatePresence>
        {isEditingText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between p-4 pt-12 pb-6"
          >
            {/* TEXT EDITOR TOP CONTROL BAR */}
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setIsEditingText(false)}
                className="px-4 py-2 rounded-full bg-white/10 text-white font-semibold text-xs border border-white/10 active:scale-95"
              >
                Cancel
              </button>

              {/* Delete button if editing existing text */}
              {editingTextId && (
                <button
                  onClick={() => handleDeleteText(editingTextId)}
                  className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center active:scale-95"
                  aria-label="Delete text"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Done / Confirm button */}
              <button
                onClick={handleSaveText}
                className="px-5 py-2 rounded-full bg-ember text-ink font-extrabold text-xs shadow-[0_0_15px_var(--color-ember-glow)] active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Done</span>
              </button>
            </div>

            {/* CENTER TEXT PREVIEW & INPUT FIELD */}
            <div className="flex-1 flex flex-col items-center justify-center my-4 px-2 overflow-y-auto">
              <div className="w-full max-w-md flex flex-col items-center">
                <textarea
                  autoFocus
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  placeholder="Type a caption..."
                  rows={3}
                  style={{
                    color:
                      selectedBgStyle === "solid" && selectedColor.toLowerCase() === "#ffffff"
                        ? "#000000"
                        : selectedColor,
                    backgroundColor:
                      selectedBgStyle === "solid"
                        ? selectedColor.toLowerCase() === "#ffffff"
                          ? "#FFFFFF"
                          : selectedColor
                        : selectedBgStyle === "semi"
                        ? "rgba(0, 0, 0, 0.7)"
                        : "transparent",
                    fontSize: `${selectedFontSize}px`,
                    textAlign: selectedAlign,
                  }}
                  className={`w-full bg-transparent resize-none outline-none border-none p-3 rounded-2xl transition-all ${
                    FONT_STYLES.find((f) => f.id === selectedFont)?.className || ""
                  } ${
                    selectedBgStyle === "outline" ? "border-2 border-white/90 bg-black/40" : ""
                  }`}
                />
              </div>
            </div>

            {/* BOTTOM TEXT TOOLBAR CONTROLS */}
            <div className="w-full flex flex-col gap-4 bg-black/60 border border-white/10 p-3.5 rounded-3xl backdrop-blur-xl">
              {/* TOP ROW: Alignment, Background Style, Size Selector */}
              <div className="flex items-center justify-between px-2 gap-2">
                {/* Text Alignment */}
                <div className="flex items-center bg-white/10 rounded-full p-1 border border-white/10">
                  <button
                    onClick={() => setSelectedAlign("left")}
                    className={`p-1.5 rounded-full transition-colors ${
                      selectedAlign === "left" ? "bg-ember text-ink" : "text-white/70"
                    }`}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedAlign("center")}
                    className={`p-1.5 rounded-full transition-colors ${
                      selectedAlign === "center" ? "bg-ember text-ink" : "text-white/70"
                    }`}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedAlign("right")}
                    className={`p-1.5 rounded-full transition-colors ${
                      selectedAlign === "right" ? "bg-ember text-ink" : "text-white/70"
                    }`}
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Background Style Toggle */}
                <div className="flex items-center bg-white/10 rounded-full p-1 border border-white/10 gap-1">
                  {BG_STYLES.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBgStyle(bg.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                        selectedBgStyle === bg.id
                          ? "bg-ember text-ink shadow-md"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>

                {/* Font Size Presets */}
                <div className="flex items-center bg-white/10 rounded-full p-1 border border-white/10 gap-0.5">
                  {[
                    { label: "S", size: 22 },
                    { label: "M", size: 32 },
                    { label: "L", size: 44 },
                  ].map((sz) => (
                    <button
                      key={sz.label}
                      onClick={() => setSelectedFontSize(sz.size)}
                      className={`w-6 h-6 rounded-full text-[11px] font-extrabold transition-colors flex items-center justify-center ${
                        selectedFontSize === sz.size ? "bg-ember text-ink" : "text-white/70"
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* MIDDLE ROW: Font Styles Swipe Carousel */}
              <div className="w-full">
                <GestureSwipeCarousel
                  items={FONT_STYLES}
                  selectedIndex={FONT_STYLES.findIndex((f) => f.id === selectedFont)}
                  onSelectIndex={(index) => setSelectedFont(FONT_STYLES[index].id)}
                  itemGap={8}
                  selectedScale={1.05}
                  unselectedOpacity={0.6}
                  renderItem={(font, _, isSelected) => (
                    <button
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border transition-all ${
                        isSelected
                          ? "bg-ember text-ink border-ember shadow-[0_0_15px_var(--color-ember-glow)]"
                          : "bg-surface-raised text-text-secondary border-hairline hover:text-white"
                      }`}
                    >
                      {font.label}
                    </button>
                  )}
                />
              </div>

              {/* BOTTOM ROW: Color Palette Swatches */}
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 px-1 justify-between">
                {COLOR_PALETTE.map((c) => {
                  const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      onClick={() => setSelectedColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-8 h-8 rounded-full shrink-0 border-2 transition-transform active:scale-90 ${
                        isSelected
                          ? "ring-2 ring-ember ring-offset-2 ring-offset-black scale-110 border-white"
                          : "border-white/20"
                      }`}
                      aria-label={`Select color ${c.name}`}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STICKER PICKER MODAL SHEET */}
      <AnimatePresence>
        {isStickerModalOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="absolute inset-x-0 bottom-0 z-50 h-[75vh] max-h-[600px] bg-black/90 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl p-4 flex flex-col justify-between shadow-2xl"
          >
            {/* HEADER & SEARCH */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-ember/20 text-ember flex items-center justify-center">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-extrabold text-white">Stickers & Badges</h3>
                </div>
                <button
                  onClick={() => setIsStickerModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stickerSearch}
                  onChange={(e) => setStickerSearch(e.target.value)}
                  placeholder="Search badges, stats, emojis..."
                  className="w-full bg-surface-raised border border-hairline rounded-full pl-10 pr-8 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-ember"
                />
                {stickerSearch && (
                  <button
                    onClick={() => setStickerSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* CATEGORY TABS */}
              <div className="w-full">
                <GestureSwipeCarousel
                  items={["All", "Badges", "Stats", "Locations"]}
                  selectedIndex={["All", "Badges", "Stats", "Locations"].indexOf(selectedStickerCategory)}
                  onSelectIndex={(index) => {
                    const cats = ["All", "Badges", "Stats", "Locations"];
                    setSelectedStickerCategory(cats[index]);
                  }}
                  itemGap={8}
                  selectedScale={1.05}
                  unselectedOpacity={0.6}
                  renderItem={(cat, _, isSelected) => (
                    <button
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border transition-all ${
                        isSelected
                          ? "bg-ember text-ink border-ember shadow-[0_0_15px_var(--color-ember-glow)]"
                          : "bg-surface-raised text-text-secondary border-hairline hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  )}
                />
              </div>
            </div>

            {/* STICKER GRID LIST */}
            <div className="flex-1 my-3 overflow-y-auto no-scrollbar pr-1">
              {filteredStickers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-white/50 text-xs">
                  <Smile className="w-8 h-8 mb-2 opacity-40" />
                  <span>No stickers found matching "{stickerSearch}"</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredStickers.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddSticker(item)}
                      className={`flex items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 group relative ${
                        `bg-gradient-to-r ${item.bgGradient || "from-amber-500 to-yellow-400"} border-white/20 shadow-lg min-h-[56px]`
                      }`}
                    >
                      <span className="text-xs font-extrabold text-white tracking-wider uppercase text-center drop-shadow-md leading-tight">
                        {item.content}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* FOOTER DISMISS */}
            <div className="pt-2 border-t border-white/10 flex justify-center">
              <button
                onClick={() => setIsStickerModalOpen(false)}
                className="px-6 py-2 rounded-full bg-white/10 text-white/80 font-bold text-xs border border-white/10 active:scale-95"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRAWING TOOL FLOATING CONTROL PANEL */}
      <AnimatePresence>
        {activeTool === "draw" && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-20 left-4 right-4 z-40 bg-black/90 backdrop-blur-2xl border border-white/20 p-3.5 rounded-3xl shadow-2xl flex flex-col gap-3"
          >
            {/* ROW 1: Brush Types & Sizes */}
            <div className="flex items-center justify-between gap-2">
              {/* Brush Types */}
              <div className="flex items-center bg-white/10 rounded-full p-1 border border-white/10 gap-1 overflow-x-auto no-scrollbar">
                {[
                  { id: "pen", label: "Pen", icon: PenTool },
                  { id: "neon", label: "Glow", icon: Sparkles },
                  { id: "highlighter", label: "Marker", icon: Highlighter },
                  { id: "eraser", label: "Eraser", icon: Eraser },
                ].map((b) => {
                  const Icon = b.icon;
                  const isSelected = brushType === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setBrushType(b.id as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                        isSelected
                          ? "bg-ember text-ink shadow-md scale-105"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{b.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Size Selector */}
              <div className="flex items-center bg-white/10 rounded-full p-1 border border-white/10 gap-1 shrink-0">
                {[
                  { label: "S", size: 3 },
                  { label: "M", size: 8 },
                  { label: "L", size: 16 },
                  { label: "XL", size: 28 },
                ].map((sz) => (
                  <button
                    key={sz.label}
                    onClick={() => setBrushSize(sz.size)}
                    className={`w-7 h-7 rounded-full text-[11px] font-extrabold flex items-center justify-center transition-colors ${
                      brushSize === sz.size ? "bg-ember text-ink" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ROW 2: Color Palette Swatches & Actions (Clear, Undo, Redo, Done) */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              {/* Color Palette (hidden when Eraser selected) */}
              {brushType !== "eraser" ? (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-[55%]">
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = brushColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        onClick={() => setBrushColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-7 h-7 rounded-full shrink-0 border-2 transition-transform active:scale-90 ${
                          isSelected
                            ? "ring-2 ring-ember ring-offset-2 ring-offset-black scale-110 border-white"
                            : "border-white/20"
                        }`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-white/50 italic px-2">
                  Rub canvas to erase strokes
                </div>
              )}

              {/* Actions: Clear, Undo, Redo, Done */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleGlobalUndo}
                  disabled={historyStack.length === 0}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center disabled:opacity-30 active:scale-95 border border-white/10"
                  title="Undo Stroke"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleGlobalRedo}
                  disabled={redoHistoryStack.length === 0}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center disabled:opacity-30 active:scale-95 border border-white/10"
                  title="Redo Stroke"
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleClearDraw}
                  className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center active:scale-95"
                  title="Clear Canvas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setActiveTool(null);
                    showToast("Drawing applied");
                  }}
                  className="px-4 py-1.5 rounded-full bg-ember text-ink font-extrabold text-xs shadow-md active:scale-95 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IMAGE TOOL FLOATING CONTROL PANEL (Crop, Perspective, Shadow) */}
      <AnimatePresence>
        {(activeTool === "crop" || isImageSelected) && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-20 left-4 right-4 z-40 bg-black/92 backdrop-blur-2xl border border-white/20 p-3.5 rounded-3xl shadow-2xl flex flex-col gap-3"
          >
            {/* Header Tabs: Crop | Perspective | Shadow */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-full border border-white/10">
                <button
                  onClick={() => setImageSubTab("crop")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    imageSubTab === "crop" ? "bg-ember text-ink shadow-md" : "text-white/70 hover:text-white"
                  }`}
                >
                  Crop
                </button>
                <button
                  onClick={() => setImageSubTab("perspective")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    imageSubTab === "perspective" ? "bg-ember text-ink shadow-md" : "text-white/70 hover:text-white"
                  }`}
                >
                  Perspective
                </button>
                <button
                  onClick={() => setImageSubTab("shadow")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    imageSubTab === "shadow" ? "bg-ember text-ink shadow-md" : "text-white/70 hover:text-white"
                  }`}
                >
                  Shadow
                </button>
              </div>

              <button
                onClick={() => {
                  setIsImageSelected(false);
                  setActiveTool(null);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* TAB 1: CROP */}
            {imageSubTab === "crop" && (
              <>
                {/* ROW 1: ASPECT RATIO CAROUSEL */}
                <div className="w-full flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-white/50 uppercase tracking-wider shrink-0 px-1">
                    Ratio
                  </span>
                  <div className="flex-1 overflow-x-auto no-scrollbar">
                    <GestureSwipeCarousel
                      items={[
                        { id: "free", label: "Free" },
                        { id: "9:16", label: "9:16 Story" },
                        { id: "1:1", label: "1:1 Square" },
                        { id: "4:5", label: "4:5 Post" },
                        { id: "16:9", label: "16:9 Landscape" },
                      ]}
                      selectedIndex={["free", "9:16", "1:1", "4:5", "16:9"].indexOf(cropRatio)}
                      onSelectIndex={(idx) => {
                        const ratios = ["free", "9:16", "1:1", "4:5", "16:9"];
                        setCropRatio(ratios[idx]);
                      }}
                      itemGap={8}
                      selectedScale={1.05}
                      unselectedOpacity={0.6}
                      renderItem={(item, _, isSelected) => (
                        <button
                          className={`px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap border transition-all ${
                            isSelected
                              ? "bg-ember text-ink border-ember shadow-[0_0_12px_var(--color-ember-glow)]"
                              : "bg-surface-raised text-text-secondary border-hairline hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      )}
                    />
                  </div>
                </div>

                {/* ROW 2: ROTATION & FLIP CONTROLS + APPLY / CANCEL */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1 bg-white/10 rounded-full p-1 border border-white/10">
                    <button
                      onClick={() => setCropRotation((prev) => (prev + 90) % 360)}
                      className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCropRotation((prev) => (prev - 90 + 360) % 360)}
                      className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
                      title="Rotate 90° Counter-Clockwise"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCropFlipH((prev) => !prev)}
                      className={`p-1.5 rounded-full transition-colors ${
                        cropFlipH ? "bg-ember text-ink font-bold" : "text-white/80 hover:text-white"
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCropFlipV((prev) => !prev)}
                      className={`p-1.5 rounded-full transition-colors ${
                        cropFlipV ? "bg-ember text-ink font-bold" : "text-white/80 hover:text-white"
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCropRatio("free");
                        setCropRotation(0);
                        setCropFlipH(false);
                        setCropFlipV(false);
                      }}
                      className="p-1.5 rounded-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 active:scale-95 transition-colors"
                      title="Reset Transform"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCropRatio(committedCrop.ratio);
                        setCropRotation(committedCrop.rotation);
                        setCropFlipH(committedCrop.flipH);
                        setCropFlipV(committedCrop.flipV);
                        setIsImageSelected(false);
                        setActiveTool(null);
                      }}
                      className="px-3 py-1.5 rounded-full bg-white/10 text-white font-semibold text-xs border border-white/10 active:scale-95"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => {
                        pushHistorySnapshot();
                        setCommittedCrop({
                          ratio: cropRatio,
                          rotation: cropRotation,
                          flipH: cropFlipH,
                          flipV: cropFlipV,
                        });
                        setIsImageSelected(false);
                        setActiveTool(null);
                        showToast("Crop & orientation applied");
                      }}
                      className="px-4 py-1.5 rounded-full bg-ember text-ink font-extrabold text-xs shadow-md active:scale-95 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Apply</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: PERSPECTIVE */}
            {imageSubTab === "perspective" && (
              <div className="flex flex-col gap-3 py-1">
                {/* Perspective X Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white/70 w-24 shrink-0">Tilt X: {imagePerspectiveX}°</span>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    value={imagePerspectiveX}
                    onChange={(e) => {
                      pushHistorySnapshot();
                      setImagePerspectiveX(Number(e.target.value));
                    }}
                    className="w-full accent-ember cursor-pointer"
                  />
                  <button
                    onClick={() => setImagePerspectiveX(0)}
                    className="text-[11px] text-white/50 hover:text-white underline shrink-0"
                  >
                    Reset
                  </button>
                </div>

                {/* Perspective Y Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white/70 w-24 shrink-0">Tilt Y: {imagePerspectiveY}°</span>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    value={imagePerspectiveY}
                    onChange={(e) => {
                      pushHistorySnapshot();
                      setImagePerspectiveY(Number(e.target.value));
                    }}
                    className="w-full accent-ember cursor-pointer"
                  />
                  <button
                    onClick={() => setImagePerspectiveY(0)}
                    className="text-[11px] text-white/50 hover:text-white underline shrink-0"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: SHADOW */}
            {imageSubTab === "shadow" && (
              <div className="flex flex-col gap-3 py-1">
                {/* Shadow Blur Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white/70 w-24 shrink-0">Blur: {imageShadowBlur}px</span>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={imageShadowBlur}
                    onChange={(e) => {
                      pushHistorySnapshot();
                      setImageShadowBlur(Number(e.target.value));
                    }}
                    className="w-full accent-ember cursor-pointer"
                  />
                </div>

                {/* Shadow Offset Y Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white/70 w-24 shrink-0">Offset: {imageShadowOffsetY}px</span>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={imageShadowOffsetY}
                    onChange={(e) => {
                      pushHistorySnapshot();
                      setImageShadowOffsetY(Number(e.target.value));
                    }}
                    className="w-full accent-ember cursor-pointer"
                  />
                </div>

                {/* Shadow Color Selector */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-white/70 w-24 shrink-0">Color:</span>
                  <div className="flex items-center gap-2">
                    {[
                      { hex: "#000000", label: "Black" },
                      { hex: "#3B82F6", label: "Blue" },
                      { hex: "#F4E409", label: "Neon" },
                      { hex: "#F43F5E", label: "Rose" },
                      { hex: "#10B981", label: "Emerald" },
                      { hex: "#FFFFFF", label: "White" },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => {
                          pushHistorySnapshot();
                          setImageShadowColor(c.hex);
                        }}
                        style={{ backgroundColor: c.hex }}
                        className={`w-6 h-6 rounded-full border border-white/20 transition-transform ${
                          imageShadowColor.toLowerCase() === c.hex.toLowerCase()
                            ? "ring-2 ring-ember scale-110"
                            : "hover:scale-105"
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LAYER MANAGER FLOATING CONTROL PANEL */}
      <AnimatePresence>
        {activeTool === "layers" && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="absolute bottom-20 left-4 right-4 z-40 bg-black/92 backdrop-blur-2xl border border-white/20 p-4 rounded-3xl shadow-2xl flex flex-col gap-3 max-h-[55vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-ember/20 text-ember border border-ember/30 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    Layer Manager
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-bold">
                      {getAllLayers().length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Reorder, lock, hide or duplicate elements
                  </p>
                </div>
              </div>

              {/* Quick Add Shortcuts */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openTextEditor()}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 border border-white/10 active:scale-95 transition-colors"
                >
                  <Plus className="w-3 h-3 text-ember" />
                  <span>Text</span>
                </button>
                <button
                  onClick={() => setIsStickerModalOpen(true)}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 border border-white/10 active:scale-95 transition-colors"
                >
                  <Plus className="w-3 h-3 text-ember" />
                  <span>Sticker</span>
                </button>
                <button
                  onClick={() => setActiveTool(null)}
                  className="w-7 h-7 rounded-full bg-white/10 text-white/70 hover:text-white flex items-center justify-center border border-white/10 ml-1 active:scale-95 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Layer Stack Items List */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 pr-1">
              {getAllLayers().map((layer, index) => {
                const isTop = index === 0;
                const isBottom = index === getAllLayers().length - 1;
                const isSelected =
                  (layer.type === "text" && selectedTextId === layer.id) ||
                  (layer.type === "sticker" && selectedStickerId === layer.id);

                return (
                  <div
                    key={layer.id}
                    onClick={() => handleSelectLayer(layer.id, layer.type)}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-ember/15 border-ember shadow-[0_0_12px_rgba(255,122,26,0.2)]"
                        : "bg-white/5 hover:bg-white/10 border-white/10"
                    }`}
                  >
                    {/* Left Icon & Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-ember border border-white/10">
                        {layer.type === "image" && <ImageIcon className="w-4 h-4 text-blue-400" />}
                        {layer.type === "draw" && <PenTool className="w-4 h-4 text-emerald-400" />}
                        {layer.type === "text" && <Type className="w-4 h-4 text-ember" />}
                        {layer.type === "sticker" && <StickyNote className="w-4 h-4 text-violet-400" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${layer.hidden ? "line-through text-white/40" : "text-white"}`}>
                            {layer.name}
                          </span>
                          {layer.locked && (
                            <span className="px-1.5 py-0.2 rounded bg-white/10 text-white/80 text-[9px] font-bold border border-white/20">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/50 truncate">{layer.subtext}</p>
                      </div>
                    </div>

                    {/* Controls: Move Up, Move Down, Duplicate, Lock, Hide, Delete */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Move Up */}
                      <button
                        onClick={() => reorderLayer(layer.id, "up")}
                        disabled={isTop}
                        className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:text-white disabled:opacity-20 active:scale-95 transition-colors"
                        title="Bring Layer Forward"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => reorderLayer(layer.id, "down")}
                        disabled={isBottom}
                        className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:text-white disabled:opacity-20 active:scale-95 transition-colors"
                        title="Send Layer Backward"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate (text & sticker only) */}
                      {(layer.type === "text" || layer.type === "sticker") && (
                        <button
                          onClick={() => duplicateLayer(layer.id, layer.type)}
                          className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:text-white hover:bg-white/20 active:scale-95 transition-colors"
                          title="Duplicate Layer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Lock Toggle */}
                      <button
                        onClick={() => toggleLayerLock(layer.id, layer.type)}
                        className={`p-1.5 rounded-lg transition-colors active:scale-95 ${
                          layer.locked
                            ? "bg-white/25 text-white border border-white/30"
                            : "bg-white/10 text-white/70 hover:text-white"
                        }`}
                        title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                      >
                        {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Hide Toggle */}
                      <button
                        onClick={() => toggleLayerVisibility(layer.id, layer.type)}
                        className={`p-1.5 rounded-lg transition-colors active:scale-95 ${
                          layer.hidden
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-white/10 text-white/70 hover:text-white"
                        }`}
                        title={layer.hidden ? "Show Layer" : "Hide Layer"}
                      >
                        {layer.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete */}
                      {layer.type !== "image" && (
                        <button
                          onClick={() => deleteLayerItem(layer.id, layer.type)}
                          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 active:scale-95 ml-0.5 transition-colors"
                          title="Delete Layer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. BOTTOM CONTEXT BAR */}
      <div className="relative z-20 px-4 pb-8 pt-2 w-full flex items-center justify-center">
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="w-full max-w-sm flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-ember text-ink font-extrabold text-sm shadow-[0_0_20px_rgba(255,122,26,0.4)] active:scale-95 transition-transform"
        >
          <span>Export & Share Image</span>
          <Send className="w-4 h-4 fill-ink" />
        </button>
      </div>

      {/* 6. EXPORT & SHARE MODAL */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        capturedImage={capturedImage}
        textOverlays={textOverlays}
        stickerOverlays={stickerOverlays}
        drawingCanvas={drawingCanvasRef.current}
        committedCrop={committedCrop}
        isBaseImageHidden={isBaseImageHidden}
        isDrawingHidden={isDrawingHidden}
        baseImageZIndex={baseImageZIndex}
        drawingZIndex={drawingZIndex}
        containerRef={canvasRef}
        showToast={showToast}
        templateId={templateId}
        statLayout={statLayout}
        statData={statData}
      />

      {/* 7. LENS FILTER PICKER BOTTOM SHEET */}
      <AnimatePresence>
        {isFilterPickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Lens Filter Selector"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="glass-surface rounded-t-3xl p-screen-gutter space-y-4 max-h-[65vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-section-header flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-ember" />
                    Lens Filters
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">Apply or change the camera lens effect</p>
                </div>
                <button
                  onClick={() => {
                    setIsFilterPickerOpen(false);
                    setActiveTool(null);
                  }}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                  aria-label="Close filter picker"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter carousel — Snapchat-style horizontal scroll */}
              <div className="w-full overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <div className="flex items-start gap-3 px-1 py-2 min-w-max">
                  {/* No filter */}
                  <button
                    onClick={() => setLensFilter("")}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-[58px]"
                  >
                    <div
                      className={`w-[56px] h-[56px] rounded-full flex items-center justify-center border-2 transition-all ${
                        lensFilter === ""
                          ? "border-ember shadow-[0_0_16px_var(--color-ember-glow)] bg-white/15"
                          : "border-white/20 bg-white/5"
                      }`}
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </div>
                    <span className="text-[9px] font-semibold text-white/70">None</span>
                  </button>

                  {/* Lens filters as circular carousel */}
                  {LENS_TEMPLATES_EXPANDED.map((lens) => {
                    const filterVal = LENS_FILTER_MAP[lens.overlayType] || "";
                    const isActive = lensFilter === filterVal;
                    return (
                      <button
                        key={lens.id}
                        onClick={() => setLensFilter(filterVal)}
                        className="flex flex-col items-center gap-1.5 shrink-0 w-[58px]"
                      >
                        <div className="relative">
                          {isActive && (
                            <motion.div
                              layoutId="editorFilterRing"
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className="absolute -inset-[3px] rounded-full"
                              style={{
                                background: `conic-gradient(from 0deg, rgba(255,255,255,0.6), rgba(255,255,255,0.1), rgba(255,255,255,0.6))`,
                                boxShadow: "0 0 16px rgba(255,255,255,0.25)",
                              }}
                            />
                          )}
                          <div
                            className={`w-[56px] h-[56px] rounded-full flex items-center justify-center text-xl border-2 transition-all overflow-hidden ${
                              isActive
                                ? "border-white bg-white/15"
                                : "border-white/15 bg-white/5"
                            }`}
                          >
                            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{lens.icon}</span>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-semibold text-center leading-tight max-w-[56px] ${
                            isActive ? "text-white" : "text-white/60"
                          }`}
                        >
                          {lens.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Intensity slider (for filter adjustment) */}
              <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs px-1">
                  <span className="font-semibold text-white/80">Filter Intensity</span>
                  <span className="text-ember font-bold">{filterIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filterIntensity}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFilterIntensity(val);
                    // Dynamically adjust the filter strength if a custom filter is active
                    if (/custom/i.test(lensFilter) || lensFilter === "") {
                      setLensFilter(
                        `contrast(${1 + val / 200}) saturate(${1 + val / 200})`
                      );
                    }
                  }}
                  className="w-full accent-ember cursor-pointer"
                />
                <p className="text-[10px] text-text-secondary text-center">
                  Adjust the overall intensity of the applied lens effect
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

