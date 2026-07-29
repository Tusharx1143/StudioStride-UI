/**
 * Lens Template admin manager — list + create/edit form with element editor.
 */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { LensTemplate, EditableLensElement } from "../../types";
import type { LensTemplateFormData } from "../../types/content";
import { getLensTemplates, createLensTemplate, updateLensTemplate, deleteLensTemplate } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X, Trash2 } from "lucide-react";

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
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-white/40">X%</label>
                    <input type="number" value={el.x} onChange={(e) => updateElement(i, { x: Number(e.target.value) })} className="w-full px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" min={0} max={100} />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40">Y%</label>
                    <input type="number" value={el.y} onChange={(e) => updateElement(i, { y: Number(e.target.value) })} className="w-full px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" min={0} max={100} />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40">Color</label>
                    <input type="color" value={el.color} onChange={(e) => updateElement(i, { color: e.target.value })} className="w-full h-7 rounded bg-surface-raised border hairline-border cursor-pointer" />
                  </div>
                </div>
              </div>
            ))}
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
            subtitle={`${lt.category} · ${lt.overlayType} · ${lt.defaultElements.length} elements`}
            isActive
            onEdit={() => startEdit(lt)}
            onToggleActive={() => {}}
            onDelete={() => setDeleteTarget(lt.id)}
          />
        ))}
        {templates.length === 0 && <p className="text-sm text-white/30 text-center py-8">No lens templates defined.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Lens" message="Are you sure you want to delete this lens template? This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
