import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { FirestoreColorPalette, ColorPaletteFormData } from "../../types/content";
import { getColorPalettes, createColorPalette, updateColorPalette, deleteColorPalette } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X } from "lucide-react";

const CATEGORIES = ["Neon", "Earth", "Ocean", "Forest", "Sunset", "Brand", "Minimal", "Vintage", "Cyberpunk", "Pastel", "Custom"];
const EMPTY_COLOR = "#000000";

const emptyForm = (): ColorPaletteFormData => ({
  name: "",
  colors: ["#FF6B35", "#F7C59F", "#EFEFD0", "#004E64", "#00A5CF"],
  category: "Custom",
});

export default function ColorPaletteManager() {
  const [palettes, setPalettes] = useState<FirestoreColorPalette[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<ColorPaletteFormData>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try { setPalettes(await getColorPalettes()); } catch (err) { console.error("Failed to load palettes", err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => { setForm(emptyForm()); setCreating(true); setEditing(null); };
  const startEdit = (p: FirestoreColorPalette) => {
    setForm({ name: p.name, colors: [...p.colors], category: p.category });
    setEditing({ id: p.id }); setCreating(false);
  };

  const updateColor = (idx: number, val: string) => {
    setForm((prev) => { const c = [...prev.colors]; c[idx] = val; return { ...prev, colors: c }; });
  };

  const addColor = () => setForm((prev) => ({ ...prev, colors: [...prev.colors, EMPTY_COLOR] }));
  const removeColor = (idx: number) => setForm((prev) => ({ ...prev, colors: prev.colors.filter((_, i) => i !== idx) }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || form.colors.length === 0) return;
    try {
      if (editing) { await updateColorPalette(editing.id, form); } else { await createColorPalette(form); }
      await load(); setCreating(false); setEditing(null);
    } catch (err) { console.error("Failed to save palette", err); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteColorPalette(deleteTarget); await load(); } catch (err) { console.error("Failed to delete palette", err); }
    setDeleteTarget(null);
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header">Color Palettes</h2>
          <p className="text-body text-white/40 text-sm">{palettes.length} palette{palettes.length !== 1 ? "s" : ""}</p>
        </div>
        {!creating && !editing && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> Add Palette
          </button>
        )}
      </div>

      {(creating || editing) && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{editing ? "Edit Palette" : "New Palette"}</h3>
            <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-surface-overlay transition-colors"><X className="w-4 h-4 text-white/40" /></button>
          </div>

          {/* Popular presets (visible when creating) */}
          {creating && (
            <div>
              <label className="text-label text-white/60 block mb-1.5">Popular Palettes</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Dracula", colors: ["#282A36", "#F8F8F2", "#FF79C6", "#50FA7B", "#BD93F9", "#FFB86C", "#8BE9FD"], category: "Cyberpunk" },
                  { name: "Nord", colors: ["#2E3440", "#D8DEE9", "#88C0D0", "#BF616A", "#A3BE8C", "#EBCB8B", "#B48EAD"], category: "Minimal" },
                  { name: "Solarized", colors: ["#002B36", "#839496", "#268BD2", "#DC322F", "#859900", "#B58900", "#CB4B16"], category: "Vintage" },
                  { name: "Tokyo Night", colors: ["#1A1B26", "#A9B1D6", "#7AA2F7", "#F7768E", "#9ECE6A", "#E0AF68", "#BB9AF7"], category: "Neon" },
                  { name: "Catppuccin", colors: ["#1E1E2E", "#CDD6F4", "#89B4FA", "#F38BA8", "#A6E3A1", "#F9E2AF", "#CBA6F7"], category: "Pastel" },
                  { name: "GitHub", colors: ["#FFFFFF", "#24292F", "#0969DA", "#CF222E", "#2DA44E", "#BF8700", "#8250DF"], category: "Minimal" },
                ].map((preset) => (
                  <button key={preset.name} type="button" onClick={() => setForm({ name: preset.name, colors: [...preset.colors], category: preset.category })}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border hairline-border hover:border-white/30 transition-all"
                    title={preset.name}
                  >
                    <div className="flex gap-px">
                      {preset.colors.slice(0, 5).map((c, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />)}
                    </div>
                    <span className="text-[10px] font-medium text-white/70">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label text-white/60 block mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Neon Nights" />
            </div>
            <div>
              <label className="text-label text-white/60 block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-label text-white/60">Colors ({form.colors.length})</label>
              <button type="button" onClick={addColor} className="text-xs px-2 py-1 rounded bg-surface text-white/60 hover:text-white transition-colors">+ Add</button>
            </div>
            <div className="space-y-1.5">
              {form.colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="color" value={c} onChange={(e) => updateColor(i, e.target.value)} className="w-9 h-9 rounded-lg border hairline-border cursor-pointer bg-surface flex-shrink-0" />
                  <input value={c} onChange={(e) => updateColor(i, e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" />
                  <button type="button" onClick={() => removeColor(i)} className="p-1.5 rounded-lg hover:bg-surface-overlay text-white/30 hover:text-danger transition-colors text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Live swatch preview */}
          {form.colors.length > 0 && (
            <div>
              <label className="text-label text-white/60 block mb-1">Swatch</label>
              <div className="flex rounded-xl overflow-hidden h-10 border hairline-border">
                {form.colors.map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} title={c} />)}
              </div>
            </div>
          )}

          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold hover:brightness-110 transition-all">
            <Save className="w-4 h-4" /> {editing ? "Update" : "Create"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {palettes.map((p) => (
          <ContentListCard
            key={p.id}
            title={p.name}
            subtitle={`${p.category} · ${p.colors.length} colors`}
            isActive
            onEdit={() => startEdit(p)}
            onToggleActive={() => {}}
            onDelete={() => setDeleteTarget(p.id)}
            preview={
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 flex rounded overflow-hidden">
                  {p.colors.slice(0, 6).map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} />)}
                </div>
                <div className="text-[6px] text-white/30 text-center mt-0.5">{p.colors.length} clr</div>
              </div>
            }
          />
        ))}
        {palettes.length === 0 && <p className="text-sm text-white/30 text-center py-8">No color palettes defined.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Palette" message="Remove this color palette?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
