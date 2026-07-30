/**
 * Lens Template admin manager — list + create/edit form with element editor.
 */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { LensTemplate, EditableLensElement } from "../../types";
import type { LensTemplateFormData } from "../../types/content";
import { getLensTemplates, createLensTemplate, updateLensTemplate, deleteLensTemplate } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X, Trash2, Eye } from "lucide-react";

const CATEGORIES = ["AI", "Trending", "Atmosphere", "Portrait", "Vintage", "Maps", "Brands", "Custom"];
const OVERLAY_TYPES = ["minimal", "strava", "cyberpunk", "vintage", "route", "trophy", "music", "custom"];
const ELEMENT_TYPES: EditableLensElement["type"][] = ["text", "metric", "badge", "sticker", "route_graphic"];

const emptyElement = (): EditableLensElement => ({
  id: `el_${Date.now()}`,
  type: "text",
  content: "New Element",
  x: 10,
  y: 50,
  fontSize: 24,
  fontFamily: "'Archivo', sans-serif",
  fontWeight: "800",
  fontStyle: "normal",
  textAlign: "left",
  color: "#FFFFFF",
});

const emptyForm = (): LensTemplateFormData => ({
  name: "",
  category: "Custom",
  icon: "📷",
  tagline: "",
  badgeColor: "bg-purple-500 text-white",
  overlayType: "minimal",
  defaultElements: [],
});

export default function LensTemplateManager() {
  const [templates, setTemplates] = useState<LensTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<LensTemplateFormData>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLensTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load lens templates", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm(emptyForm());

  const startCreate = () => {
    resetForm();
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (lt: LensTemplate) => {
    setForm({
      name: lt.name,
      category: lt.category,
      icon: lt.icon,
      tagline: lt.tagline,
      badgeColor: lt.badgeColor,
      overlayType: lt.overlayType,
      defaultElements: lt.defaultElements,
    });
    setEditing({ id: lt.id });
    setCreating(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    try {
      if (editing) {
        await updateLensTemplate(editing.id, form);
      } else {
        await createLensTemplate(form);
      }
      await load();
      setCreating(false);
      setEditing(null);
    } catch (err) {
      console.error("Failed to save lens template", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLensTemplate(deleteTarget);
      await load();
    } catch (err) {
      console.error("Failed to delete lens template", err);
    }
    setDeleteTarget(null);
  };

  const updateElement = (index: number, updates: Partial<EditableLensElement>) => {
    setForm((prev) => {
      const els = [...prev.defaultElements];
      els[index] = { ...els[index], ...updates };
      return { ...prev, defaultElements: els };
    });
  };

  const removeElement = (index: number) => {
    setForm((prev) => ({
      ...prev,
      defaultElements: prev.defaultElements.filter((_, i) => i !== index),
    }));
  };

  const addElement = () => {
    setForm((prev) => ({
      ...prev,
      defaultElements: [...prev.defaultElements, emptyElement()],
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header">Lens Templates</h2>
          <p className="text-body text-white/40 text-sm">{templates.length} lens{templates.length !== 1 ? "es" : ""}</p>
        </div>
        {!creating && !editing && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> New Lens
          </button>
        )}
      </div>

      {/* Form */}
      {(creating || editing) && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{editing ? "Edit Lens" : "New Lens"}</h3>
            <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-surface-overlay transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label text-white/60 block mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="AI Auto Focus" />
            </div>
            <div>
              <label className="text-label text-white/60 block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">Icon</label>
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="🪄" />
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">Tagline</label>
            <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="AI Auto Subject Detection & Stats" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label text-white/60 block mb-1">Badge Color</label>
              <input value={form.badgeColor} onChange={(e) => setForm({ ...form, badgeColor: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="bg-purple-500 text-white" />
            </div>
            <div>
              <label className="text-label text-white/60 block mb-1">Overlay Type</label>
              <select value={form.overlayType} onChange={(e) => setForm({ ...form, overlayType: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                {OVERLAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Default Elements sub-builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-label text-white/60 text-xs uppercase tracking-wider">Default Elements ({form.defaultElements.length})</span>
              <button type="button" onClick={addElement} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-surface text-white/60 hover:text-white text-xs transition-colors">
                <Plus className="w-3 h-3" /> Add Element
              </button>
            </div>

            {form.defaultElements.map((el, i) => (
              <div key={el.id} className="p-3 rounded-lg bg-surface border hairline-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40 font-mono">{el.id}</span>
                  <button type="button" onClick={() => removeElement(i)} className="p-1 rounded hover:bg-surface-overlay text-white/30 hover:text-danger transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-white/40">Type</label>
                    <select value={el.type} onChange={(e) => updateElement(i, { type: e.target.value as EditableLensElement["type"] })} className="w-full px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs">
                      {ELEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40">Content</label>
                    <input value={el.content} onChange={(e) => updateElement(i, { content: e.target.value })} className="w-full px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40">Font Size</label>
                    <input type="number" value={el.fontSize} onChange={(e) => updateElement(i, { fontSize: Number(e.target.value) })} className="w-full px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" min={8} max={80} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-white/40">X%</label>
                    <input type="number" value={el.x} onChange={(e) => updateElement(i, { x: Number(e.target.value) })} className="w-full px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" min={0} max={100} />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40">Y%</label>
                    <input type="number" value={el.y} onChange={(e) => updateElement(i, { y: Number(e.target.value) })} className="w-full px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" min={0} max={100} />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40">Opacity</label>
                    <input type="number" value={el.opacity ?? 1} onChange={(e) => updateElement(i, { opacity: Number(e.target.value) })} className="w-full px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" min={0} max={1} step={0.1} />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40">Color</label>
                    <input type="color" value={el.color} onChange={(e) => updateElement(i, { color: e.target.value })} className="w-full h-7 rounded bg-surface-raised border hairline-border cursor-pointer" />
                  </div>
                </div>
                {/* Inline element preview */}
                <div className="mt-1.5 px-2 py-1 rounded bg-ink/50 border border-white/5 overflow-hidden">
                  <span
                    className="block truncate leading-tight"
                    style={{
                      fontFamily: el.fontFamily,
                      fontWeight: el.fontWeight,
                      fontStyle: el.fontStyle,
                      fontSize: `${Math.min(el.fontSize, 14)}px`,
                      color: el.color,
                      textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                      textAlign: el.textAlign as "left" | "center" | "right",
                    }}
                  >
                    {el.content || "Preview"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Live canvas preview — lens elements as transparent overlays */}
          <div>
            <label className="text-label text-white/60 block mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Live Preview
            </label>
            <div className="relative w-full aspect-[9/16] max-h-[360px] rounded-xl overflow-hidden bg-ink">
              {/* Sample photo */}
              <img
                src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=400&auto=format&fit=crop"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark scrim */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
              {/* Overlay badge */}
              <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1" style={{ backgroundColor: "#00000055", color: "#FFFFFF", backdropFilter: "blur(8px)" }}>
                <span>{form.icon || "📷"}</span>
                <span>{form.name || "Lens"}</span>
                <span className="text-white/50 ml-1">· {form.overlayType}</span>
              </div>
              {/* Transparent element overlays */}
              {form.defaultElements.map((el) => (
                <div
                  key={el.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    fontSize: `${Math.round(el.fontSize * 0.6)}px`,
                    fontFamily: el.fontFamily,
                    fontWeight: el.fontWeight,
                    fontStyle: el.fontStyle,
                    color: el.color,
                    textAlign: el.textAlign,
                    textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    opacity: el.opacity ?? 1,
                    maxWidth: "80%",
                    lineHeight: 1.2,
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  } as React.CSSProperties}
                >
                  {el.content}
                </div>
              ))}
              {form.defaultElements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-white/30">Add elements to see preview</span>
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold hover:brightness-110 transition-all">
            <Save className="w-4 h-4" /> {editing ? "Update" : "Create"}
          </button>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {templates.map((lt) => (
          <ContentListCard
            key={lt.id}
            title={`${lt.icon} ${lt.name}`}
            subtitle={`${lt.category} · ${lt.overlayType} · ${lt.defaultElements.length} el`}
            isActive
            onEdit={() => startEdit(lt)}
            onToggleActive={() => {}}
            onDelete={() => setDeleteTarget(lt.id)}
            preview={
              <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
                {/* Mini photo bg */}
                <div className="absolute inset-0 opacity-60" style={{ background: `linear-gradient(135deg, #1a1a2e, #16213e)` }} />
                {/* Mini elements */}
                {lt.defaultElements.slice(0, 3).map((el, i) => (
                  <div
                    key={el.id}
                    className="absolute font-black leading-none"
                    style={{
                      left: `${el.x * 0.7}%`,
                      top: `${el.y * 0.7}%`,
                      fontSize: `${Math.max(4, Math.round(el.fontSize * 0.2))}px`,
                      color: el.color,
                      textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                      opacity: 1 - i * 0.15,
                    }}
                  >
                    {el.content.slice(0, 12)}
                  </div>
                ))}
                {/* Icon */}
                <span className="absolute bottom-1 right-1 text-[10px] opacity-40">{lt.icon}</span>
              </div>
            }
          />
        ))}
        {templates.length === 0 && <p className="text-sm text-white/30 text-center py-8">No lens templates defined.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Lens" message="Are you sure you want to delete this lens template? This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
