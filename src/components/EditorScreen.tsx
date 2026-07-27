import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Type,
  PenTool,
  StickyNote,
  Music,
  PlusCircle,
  Download,
  Send,
  Undo,
  Trash2,
  Check,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Smile,
  Sliders,
  Flame,
  Activity,
  ChevronRight,
  Share2,
  CheckCircle2,
  Volume2,
  FolderKanban,
  Wand2,
  Palette,
  Eye,
  Lock,
  Unlock,
  Copy,
  Layers,
  RotateCw,
  Search,
  Heart,
  SlidersHorizontal,
  ChevronDown,
  Maximize2
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { LENS_TEMPLATES_EXPANDED, ALL_METRICS, STOCK_PHOTOS } from "../data/mockData";
import { EditableLensElement, LensTemplate, MetricOption } from "../types";

// Quick Style Presets
const STYLE_PRESETS = [
  { id: "p_minimal", name: "Minimal", color: "#FFFFFF", bgFill: "#000000", opacity: 0.6, font: "Plus Jakarta Sans" },
  { id: "p_neon", name: "Volt Neon", color: "#F4E409", bgFill: "#101010", opacity: 0.9, font: "Space Grotesk" },
  { id: "p_strava", name: "Strava Orange", color: "#FFFFFF", bgFill: "#FC4C02", opacity: 0.95, font: "Plus Jakarta Sans" },
  { id: "p_cyber", name: "Cyber HUD", color: "#22D3EE", bgFill: "#0f172a", opacity: 0.9, font: "Courier New" },
  { id: "p_gold", name: "PR Champion", color: "#18181B", bgFill: "#FACC15", opacity: 0.95, font: "Plus Jakarta Sans" },
  { id: "p_vintage", name: "Vintage Film", color: "#18181B", bgFill: "#FEF3C7", opacity: 0.9, font: "Playfair Display" },
];

// Color palette
const COLOR_PALETTE = [
  "#F4E409", // Volt
  "#FC4C02", // Strava Orange
  "#22D3EE", // Cyber Cyan
  "#F472B6", // Pink
  "#34D399", // Emerald
  "#FACC15", // Gold
  "#FFFFFF", // White
  "#18181B", // Dark
];

const FONTS = [
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Playfair Display",
  "Courier New",
  "Impact"
];

// Social Story Preview Devices
const SOCIAL_FORMATS = [
  { id: "ig_story", name: "Instagram Story", ratio: "9:16", frameStyle: "aspect-[9/16] rounded-[2rem]" },
  { id: "ig_post", name: "Instagram Post", ratio: "1:1", frameStyle: "aspect-square rounded-2xl" },
  { id: "threads", name: "Threads", ratio: "4:5", frameStyle: "aspect-[4/5] rounded-2xl" },
  { id: "whatsapp", name: "WhatsApp Status", ratio: "9:16", frameStyle: "aspect-[9/16] rounded-[2rem]" },
];

export default function EditorScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // Initial State from Camera
  const initialCapturedImage = location.state?.capturedImage || STOCK_PHOTOS[0].url;
  const initialLensId = location.state?.selectedLensId || "minimal";

  // Main Canvas & Image state
  const [bgImage, setBgImage] = useState<string>(initialCapturedImage);
  const [activeLensId, setActiveLensId] = useState<string>(initialLensId);

  // Active Lens Elements
  const initialLensObj =
    LENS_TEMPLATES_EXPANDED.find((l) => l.id === initialLensId) || LENS_TEMPLATES_EXPANDED[0];

  const [elements, setElements] = useState<EditableLensElement[]>(initialLensObj.defaultElements);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    initialLensObj.defaultElements[0]?.id || null
  );

  // Bottom Sheet Context state
  const [activeSheet, setActiveSheet] = useState<
    "none" | "lens" | "stats" | "typography" | "color" | "presets" | "preview" | "stock"
  >("none");

  // Search filter for metric picker
  const [metricSearchQuery, setMetricSearchQuery] = useState<string>("");
  const [metricCategoryFilter, setMetricCategoryFilter] = useState<string>("All");

  // Undo / Redo history
  const [history, setHistory] = useState<EditableLensElement[][]>([]);

  // Toast / Modals state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [selectedSocialFormat, setSelectedSocialFormat] = useState<string>("ig_story");

  // Selected element helper
  const selectedElement = elements.find((e) => e.id === selectedElementId);

  // Save history state before changes
  const saveHistory = () => {
    setHistory((prev) => [...prev.slice(-10), JSON.parse(JSON.stringify(elements))]);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, h.length - 1));
      setElements(prev);
      showToast("Action undone ↩️");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Switch Lens Template
  const handleSwitchLens = (lens: LensTemplate) => {
    saveHistory();
    setActiveLensId(lens.id);
    setElements(JSON.parse(JSON.stringify(lens.defaultElements)));
    if (lens.defaultElements.length > 0) {
      setSelectedElementId(lens.defaultElements[0].id);
    }
    showToast(`Applied ${lens.name} Lens ✨`);
  };

  // Drag element on Canvas
  const handleDragElement = (id: string, deltaXPercent: number, deltaYPercent: number) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === id && !el.isLocked) {
          const newX = Math.max(0, Math.min(80, el.x + deltaXPercent));
          const newY = Math.max(0, Math.min(85, el.y + deltaYPercent));
          return { ...el, x: newX, y: newY };
        }
        return el;
      })
    );
  };

  // Dynamic Metric Binding Handler
  const handleBindMetric = (metric: MetricOption) => {
    if (!selectedElementId) return;
    saveHistory();
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === selectedElementId) {
          return {
            ...el,
            metricId: metric.id,
            content: `${metric.label}: ${metric.value} ${metric.unit}`,
          };
        }
        return el;
      })
    );
    setActiveSheet("none");
    showToast(`Bound to ${metric.label}! ⚡`);
  };

  // AI Auto Layout: automatically recalculates element positions
  const handleAIAutoLayout = () => {
    saveHistory();
    setElements((prev) =>
      prev.map((el, idx) => ({
        ...el,
        x: 10,
        y: 20 + idx * 18,
        textAlign: "left",
        fontSize: idx === 0 ? 42 : 20,
      }))
    );
    showToast("AI Auto Layout Applied! 🪄");
  };

  // Smart Color Extraction from Background Image
  const handleSmartColorExtract = () => {
    saveHistory();
    setElements((prev) =>
      prev.map((el) => ({
        ...el,
        color: "#F4E409",
        bgFill: "#101010",
        bgOpacity: 0.85,
      }))
    );
    showToast("Extracted Volt & Slate Palette 🌈");
  };

  // Apply Quick Style Preset
  const handleApplyPreset = (preset: typeof STYLE_PRESETS[0]) => {
    saveHistory();
    setElements((prev) =>
      prev.map((el) => ({
        ...el,
        color: preset.color,
        bgFill: preset.bgFill,
        bgOpacity: preset.opacity,
        fontFamily: preset.font,
      }))
    );
    showToast(`Style: ${preset.name} Applied 🎨`);
  };

  // Duplicate Element
  const handleDuplicateElement = () => {
    if (!selectedElement) return;
    saveHistory();
    const newEl: EditableLensElement = {
      ...JSON.parse(JSON.stringify(selectedElement)),
      id: "el_" + Date.now(),
      x: Math.min(80, selectedElement.x + 5),
      y: Math.min(85, selectedElement.y + 5),
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
    showToast("Element Duplicated 👯");
  };

  // Delete Element
  const handleDeleteElement = () => {
    if (!selectedElementId) return;
    saveHistory();
    setElements((prev) => prev.filter((el) => el.id !== selectedElementId));
    setSelectedElementId(null);
    showToast("Element Removed 🗑️");
  };

  // Add New Custom Text/Metric Box
  const handleAddNewElement = () => {
    saveHistory();
    const newEl: EditableLensElement = {
      id: "el_" + Date.now(),
      type: "text",
      content: "Custom Stride Stat ⚡",
      x: 20,
      y: 50,
      fontSize: 24,
      fontFamily: "Plus Jakarta Sans",
      fontWeight: "800",
      fontStyle: "normal",
      textAlign: "left",
      color: "#F4E409",
      bgFill: "#000000",
      bgOpacity: 0.7,
      borderRadius: 12,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
    showToast("Added New Element ➕");
  };

  // Save Project to Projects screen
  const handleSaveProject = () => {
    const existing = localStorage.getItem("stride_projects");
    const list = existing ? JSON.parse(existing) : [];

    const projectId = location.state?.projectId || "proj_" + Date.now();
    const projectTitle =
      location.state?.title ||
      "Snap Story " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newProject = {
      id: projectId,
      title: projectTitle,
      activityType: "Running",
      date: "Just now",
      bgImage: bgImage,
      lensId: activeLensId,
      elements: elements,
      distance: "8.42 km",
      pace: "6:12 /km",
      time: "52:18",
      updatedAt: "Just now",
      placedTextsCount: elements.length,
    };

    const filtered = list.filter((p: any) => p.id !== projectId);
    localStorage.setItem("stride_projects", JSON.stringify([newProject, ...filtered]));

    showToast("Saved to My Projects! 📁");
    setTimeout(() => {
      navigate("/projects");
    }, 900);
  };

  return (
    <div className="bg-ink text-text-primary h-[100dvh] w-full overflow-hidden flex flex-col relative font-ui select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-volt text-ink font-extrabold px-5 py-2 rounded-full text-xs shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Full-Screen Canvas Area */}
      <div
        className="relative flex-1 w-full h-full bg-cover bg-center flex flex-col justify-between overflow-hidden"
        style={{ backgroundImage: `url("${bgImage}")` }}
        onClick={() => setSelectedElementId(null)}
      >
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none"></div>

        {/* Top Header Controls */}
        <div className="relative z-30 flex justify-between items-center p-screen-gutter pt-8">
          <button
            onClick={() => navigate("/camera")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md hairline-border text-white active:scale-95 transition-transform"
            title="Back to Camera"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md hairline-border text-white transition-opacity ${
                history.length === 0 ? "opacity-30 cursor-not-allowed" : "active:scale-95"
              }`}
              title="Undo last action"
            >
              <Undo className="w-5 h-5" />
            </button>

            {/* AI Auto Layout */}
            <button
              onClick={handleAIAutoLayout}
              className="h-10 px-3.5 rounded-full bg-black/60 backdrop-blur-md hairline-border text-volt font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-transform hover:bg-black/80"
              title="AI Auto Layout"
            >
              <Wand2 className="w-4 h-4" />
              <span>AI Layout</span>
            </button>

            {/* Live Social Story Preview */}
            <button
              onClick={() => setActiveSheet("preview")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-volt text-ink active:scale-95 transition-transform shadow-[0_0_15px_rgba(244,228,9,0.4)]"
              title="Story Live Preview"
            >
              <Eye className="w-5 h-5 fill-ink" />
            </button>
          </div>
        </div>

        {/* Interactive Lens Overlay Canvas Elements */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {elements.map((el) => {
            const isSelected = el.id === selectedElementId;

            return (
              <div
                key={el.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElementId(el.id);
                }}
                className={`absolute pointer-events-auto cursor-move transition-all duration-75 select-none ${
                  isSelected ? "ring-2 ring-volt ring-offset-2 ring-offset-black/50 shadow-2xl scale-[1.02]" : ""
                }`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  fontFamily: el.fontFamily,
                  fontSize: `${el.fontSize}px`,
                  fontWeight: el.fontWeight,
                  fontStyle: el.fontStyle,
                  textAlign: el.textAlign,
                  color: el.color,
                  backgroundColor: el.bgFill
                    ? `${el.bgFill}${Math.round((el.bgOpacity ?? 0.8) * 255)
                        .toString(16)
                        .padStart(2, "0")}`
                    : "transparent",
                  borderRadius: el.borderRadius ? `${el.borderRadius}px` : "0px",
                  padding: el.bgFill ? "8px 16px" : "0px",
                  transform: `rotate(${el.rotation || 0}deg) scale(${el.scale || 1})`,
                  textShadow: el.shadowBlur
                    ? `0 0 ${el.shadowBlur}px ${el.shadowColor || "#000"}`
                    : "0 2px 8px rgba(0,0,0,0.8)",
                }}
              >
                {el.content}
              </div>
            );
          })}
        </div>

        {/* Floating Vertical Snapchat Sidebar Toolbar */}
        <div className="absolute top-24 right-4 z-30 flex flex-col items-center gap-2.5 bg-black/60 backdrop-blur-xl p-2 rounded-2xl hairline-border shadow-2xl">
          {/* Lenses Sheet */}
          <button
            onClick={() => setActiveSheet("lens")}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-volt hover:bg-white/10 transition-colors"
            title="Switch Lens"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Add Text / New Element */}
          <button
            onClick={handleAddNewElement}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            title="Add Text Element"
          >
            <Type className="w-5 h-5" />
          </button>

          {/* Dynamic Metrics Binder Sheet */}
          <button
            onClick={() => setActiveSheet("stats")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              selectedElement ? "text-amber-300 bg-white/10" : "text-white/60 hover:text-white"
            }`}
            title="Bind Metric Data"
          >
            <Activity className="w-5 h-5" />
          </button>

          {/* Font & Typography Sheet */}
          <button
            onClick={() => setActiveSheet("typography")}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            title="Typography & Fonts"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>

          {/* Colors & Palette Sheet */}
          <button
            onClick={() => setActiveSheet("color")}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-cyan-300 hover:bg-white/10 transition-colors"
            title="Colors & Fills"
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Quick Style Presets Sheet */}
          <button
            onClick={() => setActiveSheet("presets")}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-pink-400 hover:bg-white/10 transition-colors"
            title="Style Presets"
          >
            <Flame className="w-5 h-5" />
          </button>

          {/* Smart Color Extraction */}
          <button
            onClick={handleSmartColorExtract}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-400 hover:bg-white/10 transition-colors"
            title="Auto Color Extract"
          >
            <Wand2 className="w-5 h-5" />
          </button>

          {/* If Element Selected: Duplicate, Lock, Delete Controls */}
          {selectedElement && (
            <>
              <div className="w-6 h-[1px] bg-white/20 my-0.5"></div>

              <button
                onClick={handleDuplicateElement}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                title="Duplicate Element"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={handleDeleteElement}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-colors"
                title="Delete Element"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Snapchat Quick Action Bar */}
        <div className="relative z-30 bg-ink px-screen-gutter py-4 pb-safe flex items-center gap-2 border-t border-hairline">
          {/* Download Image */}
          <button
            onClick={() => showToast("Saved PNG to phone gallery! 🖼️")}
            className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center text-white active:scale-95 transition-transform hairline-border hover:bg-white/10 shrink-0"
            title="Save PNG Image"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Save Project */}
          <button
            onClick={handleSaveProject}
            className="flex-1 h-12 bg-surface-raised rounded-full flex items-center justify-center gap-1.5 active:scale-95 transition-transform hairline-border hover:bg-white/10"
          >
            <FolderKanban className="text-volt w-4 h-4" />
            <span className="text-xs font-bold text-white">Save Project</span>
          </button>

          {/* Send To / Share */}
          <button
            onClick={() => setShowSendModal(true)}
            className="flex-1 h-12 bg-volt rounded-full flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-[0_0_20px_rgba(244,228,9,0.3)] hover:bg-volt-press"
          >
            <span className="text-xs font-extrabold text-ink">Send To</span>
            <Send className="text-ink w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CONTEXTUAL BOTTOM SHEETS */}
      <AnimatePresence>
        {activeSheet !== "none" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setActiveSheet("none")}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-surface rounded-t-3xl hairline-border-t p-screen-gutter max-h-[75vh] overflow-y-auto space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* SHEET HEADER */}
              <div className="flex justify-between items-center pb-2 border-b border-hairline">
                <h3 className="text-section-header mb-0">
                  {activeSheet === "lens" && "Switch Lens Template"}
                  {activeSheet === "stats" && "Bind Metric Statistic"}
                  {activeSheet === "typography" && "Typography & Formatting"}
                  {activeSheet === "color" && "Colors & Gradient Fill"}
                  {activeSheet === "presets" && "Quick Style Presets"}
                  {activeSheet === "preview" && "Social Story Live Preview"}
                </h3>
                <button
                  onClick={() => setActiveSheet("none")}
                  className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SHEET 1: LENSES */}
              {activeSheet === "lens" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  {LENS_TEMPLATES_EXPANDED.map((lens) => (
                    <button
                      key={lens.id}
                      onClick={() => {
                        handleSwitchLens(lens);
                        setActiveSheet("none");
                      }}
                      className={`p-3.5 rounded-2xl text-left border flex flex-col justify-between h-28 transition-all ${
                        activeLensId === lens.id
                          ? "border-volt bg-volt-dim shadow-lg"
                          : "border-hairline bg-surface-raised hover:border-white/30"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-2xl">{lens.icon}</span>
                        {activeLensId === lens.id && <Check className="w-4 h-4 text-volt" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{lens.name}</div>
                        <div className="text-[10px] text-text-secondary">{lens.tagline}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* SHEET 2: DYNAMIC STATS PICKER */}
              {activeSheet === "stats" && (
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Search metric (e.g. Pace, Heart Rate, Elevation)..."
                      value={metricSearchQuery}
                      onChange={(e) => setMetricSearchQuery(e.target.value)}
                      className="w-full bg-surface-raised border border-hairline rounded-full pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                  </div>

                  {/* Category Tabs */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {["All", "Running", "Performance", "Elevation", "Ride", "Achievements"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setMetricCategoryFilter(cat)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                          metricCategoryFilter === cat
                            ? "bg-volt text-ink"
                            : "bg-surface-raised text-text-secondary hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Metric Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {ALL_METRICS.filter((m) => {
                      const matchesCategory =
                        metricCategoryFilter === "All" || m.category === metricCategoryFilter;
                      const matchesQuery =
                        m.label.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
                        m.category.toLowerCase().includes(metricSearchQuery.toLowerCase());
                      return matchesCategory && matchesQuery;
                    }).map((metric) => (
                      <button
                        key={metric.id}
                        onClick={() => handleBindMetric(metric)}
                        className="p-3 bg-surface-raised hover:bg-white/10 rounded-xl border border-hairline flex items-center justify-between transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{metric.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-white">{metric.label}</div>
                            <div className="text-[10px] text-text-secondary">{metric.category}</div>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-volt">
                          {metric.value} {metric.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SHEET 3: TYPOGRAPHY & FORMATTING */}
              {activeSheet === "typography" && selectedElement && (
                <div className="space-y-4 text-xs">
                  {/* Font Family */}
                  <div>
                    <label className="text-text-secondary block mb-1.5">Font Family</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FONTS.map((font) => (
                        <button
                          key={font}
                          onClick={() =>
                            setElements((prev) =>
                              prev.map((el) =>
                                el.id === selectedElement.id ? { ...el, fontFamily: font } : el
                              )
                            )
                          }
                          className={`p-2.5 rounded-xl border text-center font-bold ${
                            selectedElement.fontFamily === font
                              ? "border-volt bg-volt/10 text-volt"
                              : "border-hairline bg-surface-raised text-white"
                          }`}
                          style={{ fontFamily: font }}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size & Weight */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-text-secondary block mb-1">
                        Font Size ({selectedElement.fontSize}px)
                      </label>
                      <input
                        type="range"
                        min="16"
                        max="72"
                        value={selectedElement.fontSize}
                        onChange={(e) =>
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement.id
                                ? { ...el, fontSize: Number(e.target.value) }
                                : el
                            )
                          )
                        }
                        className="w-full accent-volt"
                      />
                    </div>
                    <div>
                      <label className="text-text-secondary block mb-1">Rotation</label>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        value={selectedElement.rotation || 0}
                        onChange={(e) =>
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement.id
                                ? { ...el, rotation: Number(e.target.value) }
                                : el
                            )
                          )
                        }
                        className="w-full accent-volt"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SHEET 4: COLOR & FILL */}
              {activeSheet === "color" && selectedElement && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-text-secondary block mb-2">Text Color</label>
                    <div className="flex gap-2">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() =>
                            setElements((prev) =>
                              prev.map((el) =>
                                el.id === selectedElement.id ? { ...el, color: c } : el
                              )
                            )
                          }
                          className="w-8 h-8 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-text-secondary block mb-2">Background Badge Fill</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement.id ? { ...el, bgFill: undefined } : el
                            )
                          )
                        }
                        className="px-3 py-1.5 rounded-full border border-hairline bg-surface-raised text-white text-[10px]"
                      >
                        Transparent
                      </button>
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() =>
                            setElements((prev) =>
                              prev.map((el) =>
                                el.id === selectedElement.id
                                  ? { ...el, bgFill: c, bgOpacity: 0.85, borderRadius: 12 }
                                  : el
                              )
                            )
                          }
                          className="w-8 h-8 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SHEET 5: QUICK STYLE PRESETS */}
              {activeSheet === "presets" && (
                <div className="grid grid-cols-2 gap-2.5">
                  {STYLE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        handleApplyPreset(p);
                        setActiveSheet("none");
                      }}
                      className="p-3.5 bg-surface-raised border border-hairline rounded-xl text-left hover:border-volt transition-all"
                    >
                      <div className="text-xs font-extrabold text-white">{p.name}</div>
                      <div className="flex gap-1 mt-2">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }}></span>
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.bgFill }}></span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* SHEET 6: SOCIAL STORY LIVE PREVIEW */}
              {activeSheet === "preview" && (
                <div className="space-y-4">
                  {/* Format Selector */}
                  <div className="flex gap-2 justify-center">
                    {SOCIAL_FORMATS.map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => setSelectedSocialFormat(fmt.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          selectedSocialFormat === fmt.id
                            ? "bg-volt text-ink"
                            : "bg-surface-raised text-text-secondary hover:text-white"
                        }`}
                      >
                        {fmt.name}
                      </button>
                    ))}
                  </div>

                  {/* Device Frame Live Mockup */}
                  <div className="flex justify-center py-2">
                    <div
                      className={`relative w-56 bg-cover bg-center overflow-hidden shadow-2xl border-4 border-zinc-800 ${
                        SOCIAL_FORMATS.find((f) => f.id === selectedSocialFormat)?.frameStyle
                      }`}
                      style={{ backgroundImage: `url("${bgImage}")` }}
                    >
                      <div className="absolute inset-0 bg-black/40"></div>
                      <div className="absolute inset-0 p-3 pointer-events-none">
                        {elements.map((el) => (
                          <div
                            key={el.id}
                            className="absolute text-[10px] font-bold"
                            style={{
                              left: `${el.x}%`,
                              top: `${el.y}%`,
                              color: el.color,
                            }}
                          >
                            {el.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snapchat Send To Modal */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-surface rounded-t-3xl p-screen-gutter space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-hairline">
                <div>
                  <h3 className="text-section-header mb-0.5">Send Stride Story</h3>
                  <p className="text-xs text-text-secondary">Share directly with friends & Strava</p>
                </div>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {["Aarav Singh", "Strava Athletic Club", "Instagram Stories", "WhatsApp Status"].map(
                  (target) => (
                    <div
                      key={target}
                      onClick={() => {
                        setShowSendModal(false);
                        showToast(`Shared to ${target}! 🚀`);
                      }}
                      className="p-3 bg-surface-raised rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/10"
                    >
                      <span className="text-xs font-bold text-white">{target}</span>
                      <Send className="w-4 h-4 text-volt" />
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
