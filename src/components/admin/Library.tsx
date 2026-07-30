import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { FirestoreFont, FirestoreColorPalette, FontFormData, ColorPaletteFormData } from "../../types/content";
import type { PhotoSource } from "../../types";
import { getFonts, createFont, updateFont, deleteFont } from "../../services/contentService";
import { getColorPalettes, createColorPalette, updateColorPalette, deleteColorPalette } from "../../services/contentService";
import { getStockPhotos, deleteStockPhoto } from "../../services/contentService";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X, Type, Palette, Image as ImageIcon } from "lucide-react";

type Tab = "fonts" | "colors" | "photos";

const FONT_CATEGORIES = ["sans-serif", "serif", "display", "handwriting", "monospace"];
const COMMON_WEIGHTS = ["100","200","300","400","500","600","700","800","900"];
const COLOR_CATEGORIES = ["Neon", "Earth", "Ocean", "Forest", "Sunset", "Brand", "Minimal", "Vintage", "Cyberpunk", "Custom"];

const emptyFont = (): FontFormData => ({
  name: "", fontFamily: "", category: "sans-serif", weights: ["400","700"], googleFontUrl: "", fallback: "sans-serif",
});

const emptyPalette = (): ColorPaletteFormData => ({
  name: "", colors: ["#FF6B35","#F7C59F","#EFEFD0","#004E64","#00A5CF"], category: "Custom",
});

export default function Library() {
  const [tab, setTab] = useState<Tab>("fonts");
  const [fonts, setFonts] = useState<FirestoreFont[]>([]);
  const [palettes, setPalettes] = useState<FirestoreColorPalette[]>([]);
  const [photos, setPhotos] = useState<PhotoSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Font editing
  const [fontForm, setFontForm] = useState<FontFormData>(emptyFont());
  const [editingFont, setEditingFont] = useState<string | null>(null);
  const [showFontForm, setShowFontForm] = useState(false);

  // Palette editing
  const [paletteForm, setPaletteForm] = useState<ColorPaletteFormData>(emptyPalette());
  const [editingPalette, setEditingPalette] = useState<string | null>(null);
  const [showPaletteForm, setShowPaletteForm] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, p, ph] = await Promise.all([getFonts(), getColorPalettes(), getStockPhotos()]);
      setFonts(f); setPalettes(p); setPhotos(ph);
    } catch (err) { console.error("Failed to load library", err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Font handlers
  const startFontEdit = (f: FirestoreFont) => {
    setFontForm({ name: f.name, fontFamily: f.fontFamily, category: f.category, weights: [...f.weights], googleFontUrl: f.googleFontUrl, fallback: f.fallback });
    setEditingFont(f.id); setShowFontForm(true);
  };

  const toggleWeight = (w: string) => setFontForm((p) => ({ ...p, weights: p.weights.includes(w) ? p.weights.filter(x => x !== w) : [...p.weights, w] }));

  const saveFont = async (e: FormEvent) => {
    e.preventDefault(); if (!fontForm.name || !fontForm.fontFamily) return;
    try {
      if (editingFont) { await updateFont(editingFont, fontForm); } else { await createFont(fontForm); }
      await load(); setShowFontForm(false); setEditingFont(null);
    } catch (err) { console.error(err); }
  };

  // Palette handlers
  const startPaletteEdit = (p: FirestoreColorPalette) => {
    setPaletteForm({ name: p.name, colors: [...p.colors], category: p.category });
    setEditingPalette(p.id); setShowPaletteForm(true);
  };

  const updateColor = (idx: number, val: string) => setPaletteForm((p) => { const c = [...p.colors]; c[idx] = val; return { ...p, colors: c }; });
  const addColor = () => setPaletteForm((p) => ({ ...p, colors: [...p.colors, "#000000"] }));
  const removeColor = (idx: number) => setPaletteForm((p) => ({ ...p, colors: p.colors.filter((_, i) => i !== idx) }));

  const savePalette = async (e: FormEvent) => {
    e.preventDefault(); if (!paletteForm.name || paletteForm.colors.length === 0) return;
    try {
      if (editingPalette) { await updateColorPalette(editingPalette, paletteForm); } else { await createColorPalette(paletteForm); }
      await load(); setShowPaletteForm(false); setEditingPalette(null);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (tab === "photos") await deleteStockPhoto(deleteTarget);
      if (tab === "fonts") await deleteFont(deleteTarget);
      if (tab === "colors") await deleteColorPalette(deleteTarget);
      await load();
    } catch (err) { console.error(err); }
    setDeleteTarget(null);
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-section-header">Library</h2><p className="text-body text-white/40 text-sm">Fonts, colors, and photos — used across all designs</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface-raised border hairline-border p-1 w-fit">
        {[
          { key: "fonts" as Tab, label: "Fonts", icon: Type, count: fonts.length },
          { key: "colors" as Tab, label: "Colors", icon: Palette, count: palettes.length },
          { key: "photos" as Tab, label: "Photos", icon: ImageIcon, count: photos.length },
        ].map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setShowFontForm(false); setShowPaletteForm(false); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.key ? "bg-ember text-ink" : "text-white/50 hover:text-white"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label} <span className="text-[10px] opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* ─── FONTS TAB ─── */}
      {tab === "fonts" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setFontForm(emptyFont()); setEditingFont(null); setShowFontForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
              <Plus className="w-4 h-4" /> Add Font
            </button>
          </div>

          {showFontForm && (
            <form onSubmit={saveFont} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{editingFont ? "Edit Font" : "Add Font"}</h3>
                <button type="button" onClick={() => setShowFontForm(false)} className="p-1 rounded-lg hover:bg-surface-overlay"><X className="w-4 h-4 text-white/40" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40">Name</label>
                  <input value={fontForm.name} onChange={(e) => setFontForm({ ...fontForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Inter" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40">Category</label>
                  <select value={fontForm.category} onChange={(e) => setFontForm({ ...fontForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                    {FONT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40">CSS font-family</label>
                <input value={fontForm.fontFamily} onChange={(e) => setFontForm({ ...fontForm, fontFamily: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="'Inter', sans-serif" />
              </div>
              <div>
                <label className="text-[10px] text-white/40">Weights</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {COMMON_WEIGHTS.map((w) => (
                    <button key={w} type="button" onClick={() => toggleWeight(w)} className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${fontForm.weights.includes(w) ? "bg-ember text-ink font-bold" : "bg-surface border hairline-border text-white/50"}`}>{w}</button>
                  ))}
                </div>
              </div>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold"><Save className="w-4 h-4" /> {editingFont ? "Update" : "Create"}</button>
            </form>
          )}

          {/* Font grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fonts.map((f) => (
              <div key={f.id} className="p-4 rounded-xl bg-surface-raised border hairline-border hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white" style={{ fontFamily: f.fontFamily }}>{f.name}</span>
                  <span className="text-[9px] text-white/30 px-1.5 py-0.5 rounded bg-surface">{f.category}</span>
                </div>
                <div className="space-y-0.5 mb-3" style={{ fontFamily: f.fontFamily }}>
                  {["800", "600", "400"].filter(w => f.weights.includes(w)).map((w) => (
                    <p key={w} className="text-sm truncate text-white/80" style={{ fontWeight: w }}>The quick brown fox — {w}</p>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/30">{f.weights.length} weights · {f.fallback}</span>
                  <div className="flex gap-1">
                    <button onClick={() => startFontEdit(f)} className="text-[9px] px-2 py-1 rounded bg-surface text-white/50 hover:text-white">Edit</button>
                    <button onClick={() => setDeleteTarget(f.id)} className="text-[9px] px-2 py-1 rounded bg-surface text-danger/50 hover:text-danger">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {fonts.length === 0 && <p className="text-sm text-white/30 col-span-full text-center py-8">No fonts in library.</p>}
          </div>
        </div>
      )}

      {/* ─── COLORS TAB ─── */}
      {tab === "colors" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setPaletteForm(emptyPalette()); setEditingPalette(null); setShowPaletteForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
              <Plus className="w-4 h-4" /> Add Palette
            </button>
          </div>

          {showPaletteForm && (
            <form onSubmit={savePalette} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{editingPalette ? "Edit Palette" : "New Palette"}</h3>
                <button type="button" onClick={() => setShowPaletteForm(false)} className="p-1 rounded-lg hover:bg-surface-overlay"><X className="w-4 h-4 text-white/40" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40">Name</label>
                  <input value={paletteForm.name} onChange={(e) => setPaletteForm({ ...paletteForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40">Category</label>
                  <select value={paletteForm.category} onChange={(e) => setPaletteForm({ ...paletteForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                    {COLOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Colors</label>
                <div className="space-y-1">
                  {paletteForm.colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="color" value={c} onChange={(e) => updateColor(i, e.target.value)} className="w-8 h-8 rounded-lg border hairline-border cursor-pointer bg-surface flex-shrink-0" />
                      <input value={c} onChange={(e) => updateColor(i, e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" />
                      <button type="button" onClick={() => removeColor(i)} className="text-white/30 hover:text-danger text-xs">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addColor} className="mt-1 text-[10px] px-2 py-1 rounded bg-surface text-white/50 hover:text-white">+ Add color</button>
              </div>
              {/* Swatch preview */}
              <div className="flex rounded-lg overflow-hidden h-8 border hairline-border">
                {paletteForm.colors.map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} />)}
              </div>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold"><Save className="w-4 h-4" /> {editingPalette ? "Update" : "Create"}</button>
            </form>
          )}

          {/* Palette grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {palettes.map((p) => (
              <div key={p.id} className="p-4 rounded-xl bg-surface-raised border hairline-border hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{p.name}</span>
                  <span className="text-[9px] text-white/30 px-1.5 py-0.5 rounded bg-surface">{p.category}</span>
                </div>
                <div className="flex rounded-lg overflow-hidden h-8 mb-2 border hairline-border">
                  {p.colors.slice(0, 8).map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} title={c} />)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/30">{p.colors.length} colors</span>
                  <div className="flex gap-1">
                    <button onClick={() => startPaletteEdit(p)} className="text-[9px] px-2 py-1 rounded bg-surface text-white/50 hover:text-white">Edit</button>
                    <button onClick={() => setDeleteTarget(p.id)} className="text-[9px] px-2 py-1 rounded bg-surface text-danger/50 hover:text-danger">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {palettes.length === 0 && <p className="text-sm text-white/30 col-span-full text-center py-8">No color palettes.</p>}
          </div>
        </div>
      )}

      {/* ─── PHOTOS TAB ─── */}
      {tab === "photos" && (
        <div className="space-y-4">
          <p className="text-sm text-white/40">Background photos for designs. Upload in the Stock Photos section.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((ph) => (
              <div key={ph.id} className="rounded-xl overflow-hidden bg-surface-raised border hairline-border group">
                <div className="aspect-[4/3] overflow-hidden bg-ink">
                  <img src={ph.url} alt={ph.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-[10px] text-white/60 truncate">{ph.name}</span>
                  <button onClick={() => setDeleteTarget(ph.id)} className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-danger/50 hover:text-danger flex-shrink-0">Remove</button>
                </div>
              </div>
            ))}
            {photos.length === 0 && <p className="text-sm text-white/30 col-span-full text-center py-8">No stock photos.</p>}
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete" message={`Remove this ${tab.slice(0, -1)} from the library?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
