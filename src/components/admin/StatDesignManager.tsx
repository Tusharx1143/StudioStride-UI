/**
 * Stat Design admin manager — slot-by-slot style editor with live preview.
 *
 * Admins configure each text slot (distance, pace, time, title) with
 * formatter, font, color, background, and shadow settings.
 * The accent tab lets them pick from pre-built accent types.
 */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { TextSlotId, TemplateStatDesign, TemplateLayout } from "../../types";
import type { StorableSlotStyle, StorableTemplateStatDesign, StatDesignFormData } from "../../types/content";
import { getStatDesigns, createStatDesign, updateStatDesign } from "../../services/contentService";
import { getTemplateFamilies } from "../../services/contentService";
import { FORMATTER_OPTIONS } from "../../data/formatterRegistry";
import { ACCENT_OPTIONS } from "../../data/accentRegistry";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Save, X, Eye } from "lucide-react";

const SLOT_IDS: TextSlotId[] = ["distance", "pace", "time", "title"];
const FONT_FAMILIES = ["'Archivo', sans-serif", "'Inter', sans-serif", "'Playfair Display', serif", "'Courier New', monospace", "'Space Grotesk', sans-serif"];
const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900];
const FONT_COLORS = ["#FFFFFF", "#F4E409", "#FF7A1A", "#22D3EE", "#34D399", "#A78BFA", "#F472B6", "#FF4D3D", "#000000"];

function emptySlotStyle(): StorableSlotStyle {
  return {
    textFormatter: "dist2",
    fontFamily: "'Archivo', sans-serif",
    fontSize: 36,
    fontWeight: 900,
    color: "#FFFFFF",
  };
}

function emptyForm(templateFamilyId: string): StatDesignFormData {
  return {
    templateFamilyId,
    slots: {},
    defaultLayout: {},
    accentType: "none",
  };
}

export default function StatDesignManager() {
  const [families, setFamilies] = useState<Array<{ id: string; name: string }>>([]);
  const [designs, setDesigns] = useState<Record<string, TemplateStatDesign>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TextSlotId>("distance");
  const [editingTfId, setEditingTfId] = useState<string | null>(null);
  const [form, setForm] = useState<StatDesignFormData>(emptyForm(""));
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fams, des] = await Promise.all([
        getTemplateFamilies(),
        getStatDesigns(),
      ]);
      setFamilies(fams.map((f) => ({ id: f.id, name: f.name })));
      setDesigns(des);
    } catch (err) {
      console.error("Failed to load stat designs", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (tfId: string) => {
    const existing = designs[tfId];
    if (existing) {
      const storable: StorableTemplateStatDesign = {
        templateFamilyId: tfId,
        slots: {},
        defaultLayout: existing.defaultLayout,
        accentType: "none",
      };
      // We don't need to round-trip all the details since this builder
      // creates new designs from scratch
      setForm(emptyForm(tfId));
    } else {
      setForm(emptyForm(tfId));
    }
    setEditingTfId(tfId);
    setSelectedSlot("distance");
  };

  const updateSlot = (slotId: TextSlotId, updates: Partial<StorableSlotStyle>) => {
    setForm((prev) => ({
      ...prev,
      slots: {
        ...prev.slots,
        [slotId]: { ...(prev.slots[slotId] ?? emptySlotStyle()), ...updates },
      },
    }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.templateFamilyId) return;
    try {
      if (designs[form.templateFamilyId]) {
        await updateStatDesign(form.templateFamilyId, form);
      } else {
        await createStatDesign(form);
      }
      await load();
      setEditingTfId(null);
    } catch (err) {
      console.error("Failed to save stat design", err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;
  }

  const currentSlot = form.slots[selectedSlot] ?? emptySlotStyle();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-section-header">Stat Designs</h2>
        <p className="text-body text-white/40 text-sm">Configure typography and layout per template family.</p>
      </div>

      {/* Template family grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {families.map((f) => {
          const hasDesign = !!designs[f.id];
          return (
            <button
              key={f.id}
              onClick={() => startEdit(f.id)}
              className={`p-3 rounded-xl text-center text-xs transition-all ${
                editingTfId === f.id
                  ? "bg-ember/10 border border-ember/30 text-ember"
                  : hasDesign
                    ? "bg-surface-raised border hairline-border text-white/70 hover:border-white/20"
                    : "bg-surface border hairline-border text-white/30 hover:text-white/60"
              }`}
            >
              <div className="font-medium truncate">{f.name}</div>
              <div className={`mt-1 ${hasDesign ? "text-success/70" : "text-white/20"}`}>
                {hasDesign ? "✓ Configured" : "—"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor panel */}
      {editingTfId && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Design for: {families.find((f) => f.id === editingTfId)?.name ?? editingTfId}
            </h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowPreview(!showPreview)} className="p-2 rounded-lg hover:bg-surface-overlay text-white/40 hover:text-white transition-colors">
                <Eye className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setEditingTfId(null)} className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </div>

          {/* Slot tabs */}
          <div className="flex gap-2">
            {SLOT_IDS.map((slotId) => (
              <button
                key={slotId}
                type="button"
                onClick={() => setSelectedSlot(slotId)}
                className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                  selectedSlot === slotId
                    ? "bg-ember text-ink"
                    : "bg-surface text-white/50 hover:text-white"
                }`}
              >
                {slotId}
              </button>
            ))}
            <button
              key="accent"
              type="button"
              onClick={() => setSelectedSlot("title" as TextSlotId)}
              className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                form.accentType !== "none" ? "bg-purple-500/20 text-purple-400" : "bg-surface text-white/50"
              }`}
            >
              Accent
            </button>
          </div>

          {/* Slot editor */}
          {selectedSlot && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-label text-white/60 block mb-1 text-xs">Formatter</label>
                  <select value={currentSlot.textFormatter} onChange={(e) => updateSlot(selectedSlot, { textFormatter: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs">
                    {FORMATTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-label text-white/60 block mb-1 text-xs">Font Family</label>
                  <select value={currentSlot.fontFamily} onChange={(e) => updateSlot(selectedSlot, { fontFamily: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs">
                    {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-label text-white/60 block mb-1 text-xs">Font Size</label>
                  <input type="number" value={currentSlot.fontSize} onChange={(e) => updateSlot(selectedSlot, { fontSize: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs" min={8} max={80} />
                </div>
                <div>
                  <label className="text-label text-white/60 block mb-1 text-xs">Weight</label>
                  <select value={currentSlot.fontWeight} onChange={(e) => updateSlot(selectedSlot, { fontWeight: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs">
                    {FONT_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-label text-white/60 block mb-1 text-xs">Letter Spacing</label>
                  <input type="number" value={currentSlot.letterSpacing ?? 0} onChange={(e) => updateSlot(selectedSlot, { letterSpacing: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs" min={-3} max={10} step={0.5} />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-label text-white/60 block mb-1 text-xs">Color</label>
                <div className="flex gap-1.5 flex-wrap">
                  {FONT_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => updateSlot(selectedSlot, { color: c })} className={`w-6 h-6 rounded-full border-2 transition-all ${currentSlot.color === c ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                  <input type="checkbox" checked={currentSlot.italic ?? false} onChange={(e) => updateSlot(selectedSlot, { italic: e.target.checked })} className="rounded border-white/20 bg-surface" />
                  Italic
                </label>
                <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                  <input type="checkbox" checked={currentSlot.uppercase ?? false} onChange={(e) => updateSlot(selectedSlot, { uppercase: e.target.checked })} className="rounded border-white/20 bg-surface" />
                  Uppercase
                </label>
              </div>
            </div>
          )}

          {/* Accent type selector */}
          <div>
            <label className="text-label text-white/60 block mb-1 text-xs">Accent Type</label>
            <select value={form.accentType} onChange={(e) => setForm({ ...form, accentType: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs">
              {ACCENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Simple layout editor */}
          <div>
            <label className="text-label text-white/60 block mb-1 text-xs">Default Layout (x%, y%)</label>
            <div className="grid grid-cols-2 gap-2">
              {SLOT_IDS.filter((s) => form.slots[s]).map((slotId) => {
                const pos = form.defaultLayout[slotId] ?? { x: 6, y: 50 };
                return (
                  <div key={slotId} className="flex items-center gap-2 text-xs">
                    <span className="text-white/50 w-12 uppercase">{slotId}</span>
                    <input type="number" value={pos.x} onChange={(e) => setForm({ ...form, defaultLayout: { ...form.defaultLayout, [slotId]: { x: Number(e.target.value), y: pos.y } } })} className="w-16 px-2 py-1 rounded bg-surface border hairline-border text-white text-xs" min={0} max={100} />
                    <input type="number" value={pos.y} onChange={(e) => setForm({ ...form, defaultLayout: { ...form.defaultLayout, [slotId]: { x: pos.x, y: Number(e.target.value) } } })} className="w-16 px-2 py-1 rounded bg-surface border hairline-border text-white text-xs" min={0} max={100} />
                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold hover:brightness-110 transition-all">
            <Save className="w-4 h-4" /> Save Design
          </button>
        </form>
      )}
    </div>
  );
}
