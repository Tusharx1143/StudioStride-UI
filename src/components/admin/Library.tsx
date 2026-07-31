import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { FirestoreFont, FirestoreColorPalette, FontFormData, ColorPaletteFormData } from "../../types/content";
import type { PhotoSource } from "../../types";
import { getFonts, createFont, updateFont, deleteFont } from "../../services/contentService";
import { getColorPalettes, createColorPalette, updateColorPalette, deleteColorPalette } from "../../services/contentService";
import { getStockPhotos, createStockPhoto, deleteStockPhoto } from "../../services/contentService";
import type { StockPhotoFormData } from "../../types/content";
import { isAllowedFontUrl, normalizeFontUrl, familyFromFontUrl } from "../../services/fontLoader";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X, Type, Palette, Image as ImageIcon } from "lucide-react";

type Tab = "fonts" | "colors" | "photos";

const FONT_CATEGORIES = ["sans-serif", "serif", "display", "handwriting", "monospace"];
const COMMON_WEIGHTS = ["100","200","300","400","500","600","700","800","900"];
const COLOR_CATEGORIES = ["Neon", "Earth", "Ocean", "Forest", "Sunset", "Brand", "Minimal", "Vintage", "Cyberpunk", "Pastel", "Custom"];
const PHOTO_CATEGORIES = ["Stock Running", "Cycling & Trails", "Track & Night", "Preset Gradients", "Minimal"];

const emptyPhoto = (): StockPhotoFormData => ({ name: "", category: "Stock Running", url: "" });

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

  // Photo adding
  const [photoForm, setPhotoForm] = useState<StockPhotoFormData>(emptyPhoto());
  const [showPhotoForm, setShowPhotoForm] = useState(false);
  // null = untested, true/false = the browser managed to decode the URL or not
  const [photoOk, setPhotoOk] = useState<boolean | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);

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

  /** Fill name, family, weights and category from a pasted Google Fonts URL. */
  const parseFontUrl = () => {
    if (!fontForm.googleFontUrl) return;
    // Rewrite a specimen page to its stylesheet before parsing, so pasting the
    // page you were just browsing works instead of silently loading nothing.
    const url = normalizeFontUrl(fontForm.googleFontUrl);
    const match = url.match(/family=([^:&]+)/);
    if (!match) return;
    const name = match[1].replace(/\+/g, " ");
    const weightsMatch = url.match(/wght@([\d,;]+)/);
    const weights = weightsMatch ? weightsMatch[1].split(/[;,]/).filter(Boolean) : ["400", "700"];
    setFontForm((p) => ({
      ...p,
      name,
      // Write the rewritten URL back so what saves is what actually loads.
      googleFontUrl: url,
      fontFamily: `'${name}', ${p.fallback || "sans-serif"}`,
      weights: weights.slice(0, 6),
      category: name.toLowerCase().includes("serif") && !name.toLowerCase().includes("sans") ? "serif" : "sans-serif",
    }));
  };

  const saveFont = async (e: FormEvent) => {
    e.preventDefault(); if (!fontForm.name || !fontForm.fontFamily) return;
    // Normalise on the way out too — Parse URL is optional, and a pasted
    // specimen page must not reach Firestore as one.
    const payload = {
      ...fontForm,
      googleFontUrl: fontForm.googleFontUrl ? normalizeFontUrl(fontForm.googleFontUrl) : undefined,
    };
    try {
      if (editingFont) { await updateFont(editingFont, payload); } else { await createFont(payload); }
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

  // Photo handlers
  const savePhoto = async (e: FormEvent) => {
    e.preventDefault();
    if (!photoForm.name || !photoForm.url) return;
    setPhotoSaving(true);
    try {
      await createStockPhoto(photoForm);
      await load();
      setShowPhotoForm(false);
      setPhotoForm(emptyPhoto());
      setPhotoOk(null);
    } catch (err) { console.error("Failed to save photo", err); }
    setPhotoSaving(false);
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
                {/* The stylesheet registers exactly one family name. If this
                    field doesn't name it, the face loads but never applies. */}
                {(() => {
                  const declared = familyFromFontUrl(fontForm.googleFontUrl);
                  if (!declared || !fontForm.fontFamily) return null;
                  if (fontForm.fontFamily.toLowerCase().includes(declared.toLowerCase())) return null;
                  const suggestion = `'${declared}', ${fontForm.fallback || "sans-serif"}`;
                  return (
                    <div className="mt-1 flex items-start gap-2">
                      <p className="text-[10px] text-rose-400 flex-1">
                        The stylesheet registers <span className="font-mono">{declared}</span>, which this doesn't reference — the font will silently fall back.
                      </p>
                      <button type="button" onClick={() => setFontForm((p) => ({ ...p, fontFamily: suggestion }))}
                        className="text-[10px] px-2 py-0.5 rounded bg-ember/20 text-ember font-bold border border-ember/30 hover:bg-ember/30 whitespace-nowrap flex-shrink-0">
                        Use {declared}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Without a stylesheet URL the font has nothing to load and will
                  render as its fallback everywhere. */}
              <div>
                <label className="text-[10px] text-white/40">Google Fonts URL</label>
                <div className="flex gap-2">
                  <input value={fontForm.googleFontUrl ?? ""} onChange={(e) => setFontForm({ ...fontForm, googleFontUrl: e.target.value || undefined })} className="flex-1 px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="https://fonts.googleapis.com/css2?family=Inter:wght@400;700" />
                  <button type="button" onClick={parseFontUrl} className="px-3 py-2 rounded-lg bg-ember/20 text-ember text-xs font-bold hover:bg-ember/30 border border-ember/30 transition-all whitespace-nowrap">Parse URL</button>
                </div>
                {fontForm.googleFontUrl && !isAllowedFontUrl(normalizeFontUrl(fontForm.googleFontUrl)) && (
                  <p className="text-[10px] text-rose-400 mt-1">
                    Must be an https URL on a supported font CDN (fonts.googleapis.com, fonts.bunny.net, use.typekit.net) — this one will be ignored at load time.
                  </p>
                )}
                {fontForm.googleFontUrl && normalizeFontUrl(fontForm.googleFontUrl) !== fontForm.googleFontUrl.trim() && (
                  <p className="text-[10px] text-amber-400/80 mt-1">
                    That's the Google Fonts preview page, not a stylesheet. Saving as{" "}
                    <span className="font-mono">{normalizeFontUrl(fontForm.googleFontUrl)}</span>
                  </p>
                )}
                {!fontForm.googleFontUrl && (
                  <p className="text-[10px] text-amber-400/80 mt-1">No URL — this font will fall back to {fontForm.fallback || "sans-serif"} in the app.</p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-white/40">Fallback</label>
                <input value={fontForm.fallback} onChange={(e) => setFontForm({ ...fontForm, fallback: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="sans-serif" />
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
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-white/40">Background photos for designs. Paste a direct image URL — Unsplash, Pexels, or any public host.</p>
            <button onClick={() => { setPhotoForm(emptyPhoto()); setPhotoOk(null); setShowPhotoForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all flex-shrink-0">
              <Plus className="w-4 h-4" /> Add Photo
            </button>
          </div>

          {showPhotoForm && (
            <form onSubmit={savePhoto} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Add Photo</h3>
                <button type="button" onClick={() => setShowPhotoForm(false)} className="p-1 rounded-lg hover:bg-surface-overlay"><X className="w-4 h-4 text-white/40" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40">Name</label>
                  <input value={photoForm.name} onChange={(e) => setPhotoForm({ ...photoForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Golden Hour Trail" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40">Category</label>
                  <select value={photoForm.category} onChange={(e) => setPhotoForm({ ...photoForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                    {PHOTO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40">Image URL</label>
                <input value={photoForm.url} onChange={(e) => { setPhotoForm({ ...photoForm, url: e.target.value }); setPhotoOk(null); }} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="https://images.unsplash.com/photo-…" />
              </div>

              {/* Loading the URL here is the validation — a link that won't
                  render in the admin won't render in the app either. */}
              {photoForm.url && (
                <div className="flex items-center gap-3">
                  <div className="w-28 h-20 rounded-lg overflow-hidden bg-ink border hairline-border flex-shrink-0">
                    <img src={photoForm.url} alt="" className="w-full h-full object-cover"
                      onLoad={() => setPhotoOk(true)} onError={() => setPhotoOk(false)} />
                  </div>
                  <span className={`text-xs ${photoOk === false ? "text-danger" : photoOk ? "text-success" : "text-white/30"}`}>
                    {photoOk === false ? "Could not load that URL" : photoOk ? "Image loads correctly" : "Checking…"}
                  </span>
                </div>
              )}

              <button type="submit" disabled={!photoForm.name || !photoOk || photoSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> {photoSaving ? "Saving…" : "Add Photo"}
              </button>
            </form>
          )}

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
