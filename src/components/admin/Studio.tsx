import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import type { EditableLensElement } from "../../types";
import type { LensTemplateFormData, FirestoreFont, FirestoreColorPalette } from "../../types/content";
import { getLensTemplates, createLensTemplate, updateLensTemplate, deleteLensTemplate } from "../../services/contentService";
import { getFonts } from "../../services/contentService";
import { getColorPalettes } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { resolveStickerContent, getStatValue } from "../../data/resolveStickerContent";
import { Plus, Save, X, Trash2, GripVertical, Search, Eye, EyeOff } from "lucide-react";

const CANVAS_W = 390;
const CANVAS_H = 780;

// Friendly stat definitions — shown in the "Show data from" picker
const STAT_PICKER = [
  { key: "distance",   label: "Distance",     icon: "📏", unit: "KM" },
  { key: "pace",       label: "Pace",         icon: "⏱",  unit: "/KM" },
  { key: "time",       label: "Duration",     icon: "⏰",  unit: "" },
  { key: "title",      label: "Activity Name",icon: "🏷️", unit: "" },
  { key: "avg_hr",     label: "Heart Rate",   icon: "❤️", unit: "bpm" },
  { key: "max_hr",     label: "Max Heart Rate",icon: "💓", unit: "bpm" },
  { key: "elev_gain",  label: "Elevation",    icon: "⛰️", unit: "m" },
  { key: "elev_loss",  label: "Descent",      icon: "⬇️", unit: "m" },
  { key: "speed",      label: "Speed",        icon: "⚡",  unit: "km/h" },
  { key: "max_speed",  label: "Max Speed",    icon: "🚀",  unit: "km/h" },
  { key: "cadence",    label: "Cadence",      icon: "🔄",  unit: "spm" },
  { key: "calories",   label: "Calories",     icon: "🔥",  unit: "kcal" },
  { key: "power",      label: "Power",        icon: "💪",  unit: "W" },
  { key: "avg_power",  label: "Avg Power",    icon: "📊",  unit: "W" },
  { key: "temp",       label: "Temperature",  icon: "🌡️", unit: "°C" },
];

// Default format templates per stat key
const DEFAULT_FORMAT: Record<string, string> = {
  distance:   "{value} {unit}",
  pace:       "{value} {unit}",
  time:       "{value}",
  title:      "{value}",
  avg_hr:     "{value} {unit}",
  max_hr:     "{value} {unit}",
  elev_gain:  "+{value}{unit}",
  elev_loss:  "{value}{unit}",
  speed:      "{value} km/h",
  max_speed:  "{value} km/h",
  cadence:    "{value} {unit}",
  calories:   "{value} {unit}",
  power:      "{value} {unit}",
  avg_power:  "{value} {unit}",
  temp:       "{value}{unit}",
};

// Sample stat data for live preview
const SAMPLE_DATA: Record<string, string | number | undefined> = {
  distance: 12.4, pace: "5:32", time: "1:24:15", title: "Morning Run",
  avg_hr: 154, max_hr: 172, elev_gain: 142, elev_loss: 85,
  speed: 10.5, max_speed: 14.2, cadence: 82, calories: 685,
  power: 245, avg_power: 198, temp: 22,
};

let _id = 0;
const uid = () => `el_${Date.now()}_${++_id}`;

const defaultEl = (fontFamily?: string): EditableLensElement => ({
  id: uid(), type: "text", content: "Double tap to edit", x: 20, y: 20,
  fontSize: 24, fontFamily: fontFamily ?? "'Archivo', sans-serif",
  fontWeight: "800", fontStyle: "normal", textAlign: "left",
  color: "#FFFFFF", opacity: 1,
});

const emptyForm = (): LensTemplateFormData => ({
  name: "", category: "Custom", icon: "📐", tagline: "",
  badgeColor: "bg-purple-500 text-white", overlayType: "minimal", defaultElements: [],
});

export default function Studio() {
  const [templates, setTemplates] = useState<import("../../types").LensTemplate[]>([]);
  const [fonts, setFonts] = useState<FirestoreFont[]>([]);
  const [palettes, setPalettes] = useState<FirestoreColorPalette[]>([]);
  const [loading, setLoading] = useState(true);
  const [creationType, setCreationType] = useState<"overlay" | "badge">("overlay");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<LensTemplateFormData>(emptyForm());
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showPalettePicker, setShowPalettePicker] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const [addFont, setAddFont] = useState<string>("'Archivo', sans-serif");

  const dragRef = useRef<{ id: string; startX: number; startY: number; elStartX: number; elStartY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, f, p] = await Promise.all([getLensTemplates(), getFonts(), getColorPalettes()]);
      setTemplates(t); setFonts(f); setPalettes(p);
    } catch (err) { console.error("Failed to load", err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setForm(emptyForm()); setCreating(true); setEditingId(null);
    setSelectedEl(null); setShowFontPicker(false); setShowPalettePicker(false);
  };

  const startEdit = (lt: import("../../types").LensTemplate) => {
    setForm({ ...lt, defaultElements: lt.defaultElements.map(e => ({ ...e })) });
    setEditingId(lt.id); setCreating(false); setSelectedEl(null);
  };

  const addElement = (type: EditableLensElement["type"]) => {
    const el = { ...defaultEl(addFont), id: uid(), type };
    setForm((p) => ({ ...p, defaultElements: [...p.defaultElements, el] }));
    setSelectedEl(el.id);
  };

  /** Quick-add a stat element with pre-filled format template */
  const addStatElement = (statKey: string) => {
    const meta = STAT_PICKER.find(s => s.key === statKey);
    if (!meta) return;
    const el: EditableLensElement = {
      ...defaultEl(addFont), id: uid(), type: "metric",
      content: DEFAULT_FORMAT[statKey] || "{value} {unit}",
      x: 10, y: 10 + (form.defaultElements.length * 8) % 80,
    };
    setForm((p) => ({
      ...p,
      defaultElements: [...p.defaultElements, { ...el, metricId: statKey }],
    }));
    setSelectedEl(el.id);
  };

  /** Resolve a stat element's live preview text */
  const resolvePreview = (el: EditableLensElement): string => {
    if (el.type === "metric" && el.metricId) {
      return resolveStickerContent(el.content, el.content, el.metricId, SAMPLE_DATA);
    }
    return el.content;
  };

  const removeElement = (id: string) => {
    setForm((p) => ({ ...p, defaultElements: p.defaultElements.filter((e) => e.id !== id) }));
    if (selectedEl === id) setSelectedEl(null);
  };

  const updateElement = (id: string, upd: Partial<EditableLensElement>) => {
    setForm((p) => ({ ...p, defaultElements: p.defaultElements.map((e) => e.id === id ? { ...e, ...upd } : e) }));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setForm((p) => { const els = [...p.defaultElements]; [els[idx-1], els[idx]] = [els[idx], els[idx-1]]; return { ...p, defaultElements: els }; });
  };

  const moveDown = (idx: number) => {
    setForm((p) => {
      if (idx >= p.defaultElements.length - 1) return p;
      const els = [...p.defaultElements]; [els[idx], els[idx+1]] = [els[idx+1], els[idx]];
      return { ...p, defaultElements: els };
    });
  };

  const handlePointerDown = (e: React.PointerEvent, elId: string) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const el = form.defaultElements.find((x) => x.id === elId);
    if (!el) return;
    const scaleX = rect.width / CANVAS_W, scaleY = rect.height / CANVAS_H;
    dragRef.current = { id: elId, startX: e.clientX, startY: e.clientY, elStartX: el.x, elStartY: el.y };
    const handleMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / scaleX;
      const dy = (ev.clientY - dragRef.current.startY) / scaleY;
      updateElement(dragRef.current.id, {
        x: Math.max(0, Math.min(100, dragRef.current.elStartX + dx / (CANVAS_W / 100))),
        y: Math.max(0, Math.min(100, dragRef.current.elStartY + dy / (CANVAS_H / 100))),
      });
    };
    const handleUp = () => { dragRef.current = null; window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", handleUp); };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const selected = form.defaultElements.find((e) => e.id === selectedEl);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      if (editingId) { await updateLensTemplate(editingId, form); } else { await createLensTemplate(form); }
      await load(); setCreating(false); setEditingId(null);
    } catch (err) { console.error("Failed to save", err); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteLensTemplate(deleteTarget); await load(); } catch (err) { console.error("Failed to delete", err); }
    setDeleteTarget(null);
  };

  // All available font families (built-in + from Firestore)
  const allFontFamilies = [
    "'Archivo', sans-serif", "'Inter', sans-serif", "'Space Grotesk', sans-serif",
    "'Plus Jakarta Sans', sans-serif", "'Playfair Display', serif",
    "'Courier New', monospace", "'Impact', sans-serif",
    ...fonts.map(f => f.fontFamily),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const filteredFonts = fontSearch
    ? allFontFamilies.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()))
    : allFontFamilies;

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header">Studio</h2>
          <p className="text-body text-white/40 text-sm">Design overlays and badges — drag to position, pick data to show</p>
        </div>
        {!creating && !editingId && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> New Design
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <form onSubmit={handleSave} className="space-y-4">
          {/* Creation type + name bar */}
          <div className="p-4 rounded-xl bg-surface-raised border hairline-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">{editingId ? "Edit Design" : "New Design"}</h3>
              <button type="button" onClick={() => { setCreating(false); setEditingId(null); }} className="p-1 rounded-lg hover:bg-surface-overlay transition-colors"><X className="w-4 h-4 text-white/40" /></button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg bg-surface border hairline-border p-0.5">
                <button type="button" onClick={() => setCreationType("overlay")} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${creationType === "overlay" ? "bg-ember text-ink" : "text-white/50 hover:text-white"}`}>Photo Overlay</button>
                <button type="button" onClick={() => setCreationType("badge")} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${creationType === "badge" ? "bg-ember text-ink" : "text-white/50 hover:text-white"}`}>Stat Badge</button>
              </div>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Name your design..." />
            </div>
          </div>

          {/* Main layout */}
          <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
            {/* Left: Canvas */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="p-4 rounded-xl bg-surface-raised border hairline-border flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3 text-xs text-white/40">
                  <Eye className="w-3 h-3" /> Drag elements to reposition · click to style
                </div>
                <div ref={canvasRef} className="relative w-full mx-auto rounded-xl overflow-hidden select-none flex-1 border-2 border-white/10" style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}`, maxHeight: "min(75vh, 720px)", minHeight: "400px", backgroundColor: "#0a0a0a" }}>
                  {/* Dotted grid overlay for blank canvas feel */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                  {creationType === "overlay" && (
                    <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 pointer-events-none" style={{ backgroundColor: "#00000055", color: "#FFFFFF", backdropFilter: "blur(8px)" }}>
                      <span>{form.icon}</span>
                      <span>{form.name || "Design"}</span>
                    </div>
                  )}
                  {form.defaultElements.map((el) => (
                    <div key={el.id} className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${selectedEl === el.id ? "ring-2 ring-ember ring-offset-1 ring-offset-black/60" : "hover:ring-1 hover:ring-white/30"}`}
                      style={{
                        left: `${el.x}%`, top: `${el.y}%`,
                        fontSize: `${Math.round(el.fontSize * 0.55)}px`,
                        fontFamily: el.fontFamily, fontWeight: el.fontWeight,
                        fontStyle: el.fontStyle, color: el.color,
                        textAlign: el.textAlign, opacity: el.opacity ?? 1,
                        textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                        maxWidth: "75%", lineHeight: 1.2, whiteSpace: "pre-wrap",
                        overflow: "hidden", textOverflow: "ellipsis",
                        zIndex: form.defaultElements.indexOf(el) + 1,
                      }}
                      onPointerDown={(e) => handlePointerDown(e, el.id)}
                      onClick={() => setSelectedEl(el.id)}
                    >
                      {el.type === "metric" && el.metricId
                        ? resolveStickerContent(el.content, el.content, el.metricId, SAMPLE_DATA)
                        : el.content}
                    </div>
                  ))}
                  {form.defaultElements.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                        <span className="text-2xl opacity-20">+</span>
                      </div>
                      <span className="text-xs text-white/15">Add elements from the right panel</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Element tools + properties */}
            <div className="w-full lg:w-80 space-y-3 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              {/* Add element */}
              <div className="p-3 rounded-xl bg-surface-raised border hairline-border space-y-3">
                <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Add to Canvas</label>
                {/* Text / Image */}
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => addElement("text")} className="flex-1 px-2.5 py-2 rounded-lg bg-surface border hairline-border text-xs text-white/60 hover:text-white hover:border-white/20 transition-all text-center">+ Text</button>
                  <button type="button" onClick={() => addElement("badge")} className="flex-1 px-2.5 py-2 rounded-lg bg-surface border hairline-border text-xs text-white/60 hover:text-white hover:border-white/20 transition-all text-center">+ Badge</button>
                  <button type="button" onClick={() => addElement("sticker")} className="flex-1 px-2.5 py-2 rounded-lg bg-surface border hairline-border text-xs text-white/60 hover:text-white hover:border-white/20 transition-all text-center">+ Image</button>
                </div>
                {/* Font picker for new elements */}
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Font for new elements</label>
                  <select value={addFont} onChange={(e) => setAddFont(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50">
                    {allFontFamilies.map((f) => (
                      <option key={f} value={f} style={{ fontFamily: f }}>{f.split(",")[0].replace(/['"]/g, "")}</option>
                    ))}
                  </select>
                </div>
                {/* Data elements — pick a stat to show */}
                <div>
                  <label className="text-[10px] text-white/40 block mb-1.5">Show data from:</label>
                  <div className="grid grid-cols-2 gap-1 max-h-[180px] overflow-y-auto">
                    {STAT_PICKER.map((s) => (
                      <button key={s.key} type="button" onClick={() => addStatElement(s.key)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface border hairline-border text-[11px] text-white/70 hover:text-white hover:border-white/20 transition-all text-left">
                        <span className="text-sm">{s.icon}</span>
                        <span className="truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Element list */}
              <div className="p-3 rounded-xl bg-surface-raised border hairline-border space-y-1.5 max-h-[220px] overflow-y-auto">
                <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-1.5">Elements ({form.defaultElements.length})</label>
                {form.defaultElements.map((el, i) => (
                  <div key={el.id} onClick={() => setSelectedEl(el.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${selectedEl === el.id ? "bg-ember/10 ring-1 ring-ember/30" : "hover:bg-surface-overlay"}`}>
                    <GripVertical className="w-3 h-3 text-white/20 flex-shrink-0 cursor-grab" />
                    <span className="text-[11px] text-white/70 truncate flex-1">{el.type === "metric" && el.metricId ? STAT_PICKER.find(s => s.key === el.metricId)?.label || el.metricId : el.content.slice(0, 16) || el.type}</span>
                    <span className="text-[9px] text-white/30 uppercase">{el.type}</span>
                    <div className="flex gap-0.5">
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveUp(i); }} className="p-0.5 hover:text-white text-white/20 text-[10px]" disabled={i === 0}>▲</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveDown(i); }} className="p-0.5 hover:text-white text-white/20 text-[10px]" disabled={i === form.defaultElements.length - 1}>▼</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} className="p-0.5 hover:text-danger text-white/20 text-[10px]">✕</button>
                    </div>
                  </div>
                ))}
                {form.defaultElements.length === 0 && <span className="text-[10px] text-white/20 block text-center py-3">No elements yet</span>}
              </div>

              {/* Property editor */}
              {selected && (
                <div className="p-3 rounded-xl bg-surface-raised border hairline-border space-y-3 max-h-[400px] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Style</span>
                    <span className="text-[9px] text-white/30 capitalize">{selected.type.replace("_", " ")}</span>
                  </div>

                  {/* Stat picker for metric elements */}
                  {selected.type === "metric" && (
                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">Show data</label>
                      <select value={selected.metricId || ""} onChange={(e) => {
                        const meta = STAT_PICKER.find(s => s.key === e.target.value);
                        updateElement(selected.id, {
                          metricId: e.target.value,
                          content: meta ? DEFAULT_FORMAT[meta.key] || "{value} {unit}" : selected.content,
                        });
                      }} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50">
                        <option value="">— Select —</option>
                        {STAT_PICKER.map((s) => <option key={s.key} value={s.key}>{s.icon} {s.label} ({s.unit || "text"})</option>)}
                      </select>
                    </div>
                  )}

                  {/* Content (for text/badge elements) */}
                  {(selected.type === "text" || selected.type === "badge") && (
                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">Text</label>
                      <input value={selected.content} onChange={(e) => updateElement(selected.id, { content: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50" />
                    </div>
                  )}

                  {/* Format template — only for metric elements */}
                  {selected.type === "metric" && selected.metricId && (
                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">Appearance</label>
                      <div className="flex items-center gap-2">
                        <input value={selected.content} onChange={(e) => updateElement(selected.id, { content: e.target.value })}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" />
                      </div>
                      <div className="mt-1 px-2 py-1 rounded bg-ink/50 border border-white/5">
                        <span className="text-[10px] text-ember font-bold">
                          {resolveStickerContent(selected.content, selected.content, selected.metricId, SAMPLE_DATA)}
                        </span>
                      </div>
                      <p className="text-[9px] text-white/30 mt-0.5">Use {'{value}'}, {'{unit}'}, {'{label}'}</p>
                    </div>
                  )}

                  {/* Size & Weight */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40">Size</label>
                      <input type="number" value={selected.fontSize} onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50" min={8} max={120} />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">Weight</label>
                      <select value={selected.fontWeight} onChange={(e) => updateElement(selected.id, { fontWeight: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50">
                        {["300", "400", "500", "600", "700", "800", "900"].map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Font Family + inline preview */}
                  <div className="relative">
                    <label className="text-[10px] text-white/40 block mb-1">Font</label>
                    <div className="relative mb-1">
                      <Search className="w-3 h-3 text-white/30 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input value={fontSearch} onChange={(e) => { setFontSearch(e.target.value); setShowFontPicker(true); }}
                        onFocus={() => setShowFontPicker(true)}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50"
                        placeholder="Search fonts..." />
                    </div>
                    {showFontPicker && (
                      <div className="z-20 mb-1 p-1 rounded-lg bg-surface-raised border hairline-border shadow-xl max-h-[160px] overflow-y-auto">
                        {filteredFonts.map((f) => (
                          <button key={f} type="button" onClick={() => { updateElement(selected.id, { fontFamily: f }); setShowFontPicker(false); setFontSearch(""); }}
                            className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-surface-overlay text-white/70 hover:text-white transition-colors" style={{ fontFamily: f }}>
                            {f.split(",")[0].replace(/['"]/g, "")}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="px-2 py-1.5 rounded bg-ink/50 border border-white/5 text-sm truncate" style={{ fontFamily: selected.fontFamily, fontWeight: selected.fontWeight }}>
                      {selected.type === "metric" && selected.metricId
                        ? resolveStickerContent(selected.content, selected.content, selected.metricId, SAMPLE_DATA)
                        : selected.content || "Preview"}
                    </div>
                  </div>

                  {/* Color + palette swatches inline */}
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Color</label>
                    <div className="flex items-center gap-2 mb-1.5">
                      <input type="color" value={selected.color} onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                        className="w-7 h-7 rounded-lg border hairline-border cursor-pointer bg-surface flex-shrink-0" />
                      <input value={selected.color} onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" />
                      <button type="button" onClick={() => { setShowPalettePicker(!showPalettePicker); setShowFontPicker(false); }}
                        className="px-2 py-1.5 rounded-lg bg-surface border hairline-border text-[9px] text-white/50 hover:text-white">Palettes</button>
                    </div>
                    {showPalettePicker && (
                      <div className="p-1.5 rounded-lg bg-surface border hairline-border space-y-1.5 max-h-[120px] overflow-y-auto">
                        {palettes.map((p) => (
                          <div key={p.id}>
                            <div className="text-[9px] text-white/30 mb-0.5">{p.name}</div>
                            <div className="flex gap-1">
                              {p.colors.map((c, i) => (
                                <button key={i} type="button" onClick={() => { updateElement(selected.id, { color: c }); setShowPalettePicker(false); }}
                                  className="w-5 h-5 rounded border hairline-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                              ))}
                            </div>
                          </div>
                        ))}
                        {palettes.length === 0 && <span className="text-[9px] text-white/20">No palettes</span>}
                      </div>
                    )}
                  </div>

                  {/* Position & effects */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40">Position X%</label>
                      <input type="number" value={Math.round(selected.x)} onChange={(e) => updateElement(selected.id, { x: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50" min={0} max={100} />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">Position Y%</label>
                      <input type="number" value={Math.round(selected.y)} onChange={(e) => updateElement(selected.id, { y: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50" min={0} max={100} />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">Opacity</label>
                      <input type="number" value={selected.opacity ?? 1} onChange={(e) => updateElement(selected.id, { opacity: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50" min={0} max={1} step={0.1} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40">Align</label>
                      <select value={selected.textAlign} onChange={(e) => updateElement(selected.id, { textAlign: e.target.value as "left" | "center" | "right" })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50">
                        <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">Rotation</label>
                      <input type="number" value={selected.rotation ?? 0} onChange={(e) => updateElement(selected.id, { rotation: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs focus:outline-none focus:ring-2 focus:ring-ember/50" min={-180} max={180} />
                    </div>
                  </div>
                </div>
              )}

              {/* Save */}
              <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
                <Save className="w-4 h-4" /> {editingId ? "Update" : "Publish Design"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Saved designs — published view */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Published Designs</h3>
        {templates.map((lt) => (
          <ContentListCard
            key={lt.id}
            title={`${lt.icon} ${lt.name}`}
            subtitle={`${lt.category} · ${lt.overlayType} · ${lt.defaultElements.length} elements`}
            isActive
            onEdit={() => startEdit(lt)}
            onToggleActive={() => {}}
            onDelete={() => setDeleteTarget(lt.id)}
            preview={
              <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
                <div className="absolute inset-0 opacity-60" style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }} />
                {lt.defaultElements.slice(0, 3).map((el, i) => (
                  <div key={el.id} className="absolute font-black leading-none" style={{ left: `${el.x * 0.7}%`, top: `${el.y * 0.7}%`, fontSize: `${Math.max(4, Math.round(el.fontSize * 0.2))}px`, color: el.color, textShadow: "0 1px 4px rgba(0,0,0,0.8)", opacity: 1 - i * 0.15 }}>
                    {el.content.slice(0, 12)}
                  </div>
                ))}
                <span className="absolute bottom-1 right-1 text-[10px] opacity-40">{lt.icon}</span>
              </div>
            }
          />
        ))}
        {templates.length === 0 && <p className="text-sm text-white/30 text-center py-8">No designs published yet.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Design" message="Remove this design?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
