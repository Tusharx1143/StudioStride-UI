import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import type { EditableLensElement } from "../../types";
import type { LensTemplateFormData, FirestoreFont, FirestoreColorPalette } from "../../types/content";
import { getLensTemplates, createLensTemplate, updateLensTemplate, deleteLensTemplate } from "../../services/contentService";
import { getFonts } from "../../services/contentService";
import { getColorPalettes } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X, Trash2, GripVertical, ChevronDown } from "lucide-react";

const CANVAS_W = 390;
const CANVAS_H = 780;
const ELEMENT_TYPES: EditableLensElement["type"][] = ["text", "metric", "badge", "sticker", "route_graphic"];
const OVERLAY_TYPES = ["minimal", "strava", "cyberpunk", "vintage", "route", "trophy", "music", "custom"];

let _id = 0;
const uid = () => `el_${Date.now()}_${++_id}`;

const defaultEl = (): EditableLensElement => ({
  id: uid(),
  type: "text", content: "Double tap to edit", x: 20, y: 20,
  fontSize: 24, fontFamily: "'Archivo', sans-serif",
  fontWeight: "800", fontStyle: "normal", textAlign: "left",
  color: "#FFFFFF", opacity: 1,
});

const emptyForm = (): LensTemplateFormData => ({
  name: "", category: "Custom", icon: "🎨", tagline: "",
  badgeColor: "bg-purple-500 text-white", overlayType: "minimal", defaultElements: [],
});

export default function CreativeToolbox() {
  // Data
  const [templates, setTemplates] = useState<import("../../types").LensTemplate[]>([]);
  const [fonts, setFonts] = useState<FirestoreFont[]>([]);
  const [palettes, setPalettes] = useState<FirestoreColorPalette[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<LensTemplateFormData>(emptyForm());
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showPalettePicker, setShowPalettePicker] = useState(false);

  // Drag state
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
    setForm(emptyForm()); setCreating(true); setEditingId(null); setSelectedEl(null); setShowFontPicker(false); setShowPalettePicker(false);
  };

  const startEdit = (lt: import("../../types").LensTemplate) => {
    setForm({ name: lt.name, category: lt.category, icon: lt.icon, tagline: lt.tagline, badgeColor: lt.badgeColor, overlayType: lt.overlayType, defaultElements: lt.defaultElements.map(e => ({ ...e })) });
    setEditingId(lt.id); setCreating(false); setSelectedEl(null);
  };

  const addElement = (type: EditableLensElement["type"]) => {
    const el = { ...defaultEl(), id: uid(), type };
    setForm((p) => ({ ...p, defaultElements: [...p.defaultElements, el] }));
    setSelectedEl(el.id);
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
    setForm((p) => {
      const els = [...p.defaultElements];
      [els[idx - 1], els[idx]] = [els[idx], els[idx - 1]];
      return { ...p, defaultElements: els };
    });
  };

  const moveDown = (idx: number) => {
    setForm((p) => {
      if (idx >= p.defaultElements.length - 1) return p;
      const els = [...p.defaultElements];
      [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
      return { ...p, defaultElements: els };
    });
  };

  // Canvas drag handlers
  const handlePointerDown = (e: React.PointerEvent, elId: string) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const el = form.defaultElements.find((x) => x.id === elId);
    if (!el) return;
    const scaleX = rect.width / CANVAS_W;
    const scaleY = rect.height / CANVAS_H;
    dragRef.current = {
      id: elId,
      startX: e.clientX,
      startY: e.clientY,
      elStartX: el.x,
      elStartY: el.y,
    };
    const handleMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / scaleX;
      const dy = (ev.clientY - dragRef.current.startY) / scaleY;
      updateElement(dragRef.current.id, {
        x: Math.max(0, Math.min(100, dragRef.current.elStartX + dx / (CANVAS_W / 100))),
        y: Math.max(0, Math.min(100, dragRef.current.elStartY + dy / (CANVAS_H / 100))),
      });
    };
    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
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

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header">Creative Toolbox</h2>
          <p className="text-body text-white/40 text-sm">Visual canvas designer — drag, style, and save lens templates</p>
        </div>
        {!creating && !editingId && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> New Design
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <form onSubmit={handleSave} className="space-y-4">
          {/* Metadata row */}
          <div className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{editingId ? "Edit Design" : "New Design"}</h3>
              <button type="button" onClick={() => { setCreating(false); setEditingId(null); }} className="p-1 rounded-lg hover:bg-surface-overlay transition-colors"><X className="w-4 h-4 text-white/40" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-label text-white/60 block mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="My Design" />
              </div>
              <div>
                <label className="text-label text-white/60 block mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                  {["AI", "Trending", "Atmosphere", "Portrait", "Vintage", "Maps", "Brands", "Custom"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-label text-white/60 block mb-1">Overlay Type</label>
                <select value={form.overlayType} onChange={(e) => setForm({ ...form, overlayType: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                  {OVERLAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-label text-white/60 block mb-1">Icon</label>
                <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="🎨" />
              </div>
            </div>
          </div>

          {/* Main: canvas + element panel */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Canvas */}
            <div className="flex-1 min-w-0">
              <div className="p-4 rounded-xl bg-surface-raised border hairline-border">
                <div className="flex items-center gap-2 mb-3 text-xs text-white/40">
                  <span className="w-2 h-2 rounded-full bg-ember" />
                  Canvas — drag elements to reposition
                </div>
                <div
                  ref={canvasRef}
                  className="relative w-full mx-auto rounded-xl overflow-hidden bg-ink select-none"
                  style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}`, maxHeight: "600px" }}
                >
                  {/* Sample photo */}
                  <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=400&auto=format&fit=crop" alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
                  {/* Badge */}
                  <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 pointer-events-none" style={{ backgroundColor: "#00000055", color: "#FFFFFF", backdropFilter: "blur(8px)" }}>
                    <span>{form.icon || "🎨"}</span>
                    <span>{form.name || "Design"}</span>
                  </div>
                  {/* Elements */}
                  {form.defaultElements.map((el) => (
                    <div
                      key={el.id}
                      className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${selectedEl === el.id ? "ring-2 ring-ember ring-offset-1 ring-offset-black/60" : "hover:ring-1 hover:ring-white/30"}`}
                      style={{
                        left: `${el.x}%`, top: `${el.y}%`,
                        fontSize: `${Math.round(el.fontSize * 0.55)}px`,
                        fontFamily: el.fontFamily, fontWeight: el.fontWeight,
                        fontStyle: el.fontStyle, color: el.color,
                        textAlign: el.textAlign, opacity: el.opacity ?? 1,
                        textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                        maxWidth: "75%", lineHeight: 1.2,
                        whiteSpace: "pre-wrap", overflow: "hidden",
                        textOverflow: "ellipsis",
                        zIndex: form.defaultElements.indexOf(el) + 1,
                      }}
                      onPointerDown={(e) => handlePointerDown(e, el.id)}
                      onClick={() => setSelectedEl(el.id)}
                    >
                      {el.content}
                    </div>
                  ))}
                  {form.defaultElements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-xs text-white/20">Add elements below to start designing</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right panel: elements list + property editor */}
            <div className="w-full lg:w-80 space-y-3">
              {/* Add element buttons */}
              <div className="p-3 rounded-xl bg-surface-raised border hairline-border">
                <label className="text-label text-white/60 block mb-2 text-xs">Add Element</label>
                <div className="flex flex-wrap gap-1.5">
                  {ELEMENT_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => addElement(t)} className="px-2.5 py-1.5 rounded-lg bg-surface border hairline-border text-xs text-white/70 hover:text-white hover:border-white/30 transition-all capitalize">
                      + {t.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Element list */}
              <div className="p-3 rounded-xl bg-surface-raised border hairline-border space-y-2 max-h-[280px] overflow-y-auto">
                <label className="text-label text-white/60 block text-xs">Elements ({form.defaultElements.length})</label>
                {form.defaultElements.map((el, i) => (
                  <div key={el.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${selectedEl === el.id ? "bg-ember/10 ring-1 ring-ember/30" : "hover:bg-surface-overlay"}`} onClick={() => setSelectedEl(el.id)}>
                    <GripVertical className="w-3 h-3 text-white/20 flex-shrink-0" />
                    <span className="text-[10px] text-white/30 font-mono w-5 flex-shrink-0">{i + 1}</span>
                    <span className="text-xs text-white/70 truncate flex-1">{el.content.slice(0, 18) || el.type}</span>
                    <span className="text-[9px] text-white/30 uppercase">{el.type}</span>
                    <div className="flex gap-0.5">
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveUp(i); }} className="p-0.5 hover:text-white text-white/20 text-[10px] disabled:opacity-20" disabled={i === 0}>▲</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveDown(i); }} className="p-0.5 hover:text-white text-white/20 text-[10px]" disabled={i === form.defaultElements.length - 1}>▼</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} className="p-0.5 hover:text-danger text-white/20 text-[10px]">✕</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Property editor */}
              {selected && (
                <div className="p-3 rounded-xl bg-surface-raised border hairline-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Properties</span>
                    <span className="text-[9px] text-white/30 font-mono">{selected.id.slice(-6)}</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-white/40">Content</label>
                    <input value={selected.content} onChange={(e) => updateElement(selected.id, { content: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-ember/50" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40">Font Size</label>
                      <input type="number" value={selected.fontSize} onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-ember/50" min={8} max={120} />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">Weight</label>
                      <select value={selected.fontWeight} onChange={(e) => updateElement(selected.id, { fontWeight: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-ember/50">
                        {["300", "400", "500", "600", "700", "800", "900"].map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="relative">
                    <label className="text-[10px] text-white/40">Font Family</label>
                    <button type="button" onClick={() => { setShowFontPicker(!showFontPicker); setShowPalettePicker(false); }} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs mt-0.5 hover:border-white/20 transition-colors">
                      <span className="truncate" style={{ fontFamily: selected.fontFamily }}>{selected.fontFamily}</span>
                      <ChevronDown className="w-3 h-3 text-white/30 flex-shrink-0" />
                    </button>
                    {showFontPicker && (
                      <div className="absolute z-20 left-0 right-0 mt-1 p-1.5 rounded-lg bg-surface-raised border hairline-border shadow-xl max-h-[180px] overflow-y-auto">
                        {[{ fontFamily: "'Archivo', sans-serif" }, { fontFamily: "'Inter', sans-serif" }, { fontFamily: "'Space Grotesk', sans-serif" }, { fontFamily: "'Plus Jakarta Sans', sans-serif" }, { fontFamily: "'Playfair Display', serif" }, { fontFamily: "'Courier New', monospace" }, { fontFamily: "'Impact', sans-serif" }, ...fonts.map((f) => ({ fontFamily: f.fontFamily }))].map((f, i) => (
                          <button key={i} type="button" onClick={() => { updateElement(selected.id, { fontFamily: f.fontFamily }); setShowFontPicker(false); }} className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-surface-overlay text-white/70 hover:text-white transition-colors" style={{ fontFamily: f.fontFamily }}>
                            {f.fontFamily}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-[10px] text-white/40">Color</label>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input type="color" value={selected.color} onChange={(e) => updateElement(selected.id, { color: e.target.value })} className="w-8 h-8 rounded-lg border hairline-border cursor-pointer bg-surface flex-shrink-0" />
                      <input value={selected.color} onChange={(e) => updateElement(selected.id, { color: e.target.value })} className="flex-1 px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" />
                      <button type="button" onClick={() => { setShowPalettePicker(!showPalettePicker); setShowFontPicker(false); }} className="px-2 py-1.5 rounded-lg bg-surface border hairline-border text-[9px] text-white/50 hover:text-white">Palette</button>
                    </div>
                    {showPalettePicker && (
                      <div className="mt-1.5 p-2 rounded-lg bg-surface border hairline-border space-y-2 max-h-[140px] overflow-y-auto">
                        {palettes.map((p) => (
                          <div key={p.id}>
                            <div className="text-[9px] text-white/30 mb-0.5">{p.name}</div>
                            <div className="flex gap-1">
                              {p.colors.map((c, i) => (
                                <button key={i} type="button" onClick={() => { updateElement(selected.id, { color: c }); }} className="w-6 h-6 rounded-md border hairline-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                              ))}
                            </div>
                          </div>
                        ))}
                        {palettes.length === 0 && <span className="text-[10px] text-white/20">No palettes — add in Color Palettes section</span>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40">X%</label>
                      <input type="number" value={Math.round(selected.x)} onChange={(e) => updateElement(selected.id, { x: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-ember/50" min={0} max={100} />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">Y%</label>
                      <input type="number" value={Math.round(selected.y)} onChange={(e) => updateElement(selected.id, { y: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-ember/50" min={0} max={100} />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">Opacity</label>
                      <input type="number" value={selected.opacity ?? 1} onChange={(e) => updateElement(selected.id, { opacity: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-ember/50" min={0} max={1} step={0.1} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40">Align</label>
                      <select value={selected.textAlign} onChange={(e) => updateElement(selected.id, { textAlign: e.target.value as "left" | "center" | "right" })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-ember/50">
                        <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">Rotation</label>
                      <input type="number" value={selected.rotation ?? 0} onChange={(e) => updateElement(selected.id, { rotation: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-ember/50" min={-180} max={180} />
                    </div>
                  </div>
                </div>
              )}

              {/* Save */}
              <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
                <Save className="w-4 h-4" /> {editingId ? "Update Template" : "Save Template"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Saved templates */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Saved Designs</h3>
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
        {templates.length === 0 && <p className="text-sm text-white/30 text-center py-8">No designs saved yet.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Design" message="Remove this lens template design?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
