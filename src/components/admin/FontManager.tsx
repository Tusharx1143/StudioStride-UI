import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { FirestoreFont, FontFormData } from "../../types/content";
import { getFonts, createFont, updateFont, deleteFont } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X } from "lucide-react";

const CATEGORIES = ["sans-serif", "serif", "display", "handwriting", "monospace"];
const COMMON_WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];

const emptyForm = (): FontFormData => ({
  name: "",
  fontFamily: "",
  category: "sans-serif",
  weights: ["400", "700"],
  googleFontUrl: "",
  fallback: "sans-serif",
});

export default function FontManager() {
  const [fonts, setFonts] = useState<FirestoreFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<FontFormData>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try { setFonts(await getFonts()); } catch (err) { console.error("Failed to load fonts", err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => { setForm(emptyForm()); setCreating(true); setEditing(null); };
  const startEdit = (f: FirestoreFont) => {
    setForm({ name: f.name, fontFamily: f.fontFamily, category: f.category, weights: f.weights, googleFontUrl: f.googleFontUrl, fallback: f.fallback });
    setEditing({ id: f.id }); setCreating(false);
  };

  const toggleWeight = (w: string) => {
    setForm((p) => ({ ...p, weights: p.weights.includes(w) ? p.weights.filter((x) => x !== w) : [...p.weights, w] }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.fontFamily) return;
    try {
      if (editing) { await updateFont(editing.id, form); } else { await createFont(form); }
      await load(); setCreating(false); setEditing(null);
    } catch (err) { console.error("Failed to save font", err); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteFont(deleteTarget); await load(); } catch (err) { console.error("Failed to delete font", err); }
    setDeleteTarget(null);
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header">Font Library</h2>
          <p className="text-body text-white/40 text-sm">{fonts.length} font{fonts.length !== 1 ? "s" : ""}</p>
        </div>
        {!creating && !editing && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> Add Font
          </button>
        )}
      </div>

      {(creating || editing) && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{editing ? "Edit Font" : "Add Font"}</h3>
            <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-surface-overlay transition-colors"><X className="w-4 h-4 text-white/40" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label text-white/60 block mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Inter" />
            </div>
            <div>
              <label className="text-label text-white/60 block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">CSS font-family</label>
            <input value={form.fontFamily} onChange={(e) => setForm({ ...form, fontFamily: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="'Inter', sans-serif" />
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">Google Fonts URL (optional)</label>
            <div className="flex gap-2">
              <input value={form.googleFontUrl ?? ""} onChange={(e) => setForm({ ...form, googleFontUrl: e.target.value || undefined })} className="flex-1 px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="https://fonts.googleapis.com/css2?family=Inter:opsz@14..32" />
              <button type="button" onClick={() => {
                const url = form.googleFontUrl;
                if (!url) return;
                const match = url.match(/family=([^:&]+)/);
                if (!match) return;
                const name = match[1].replace(/\+/g, " ");
                const weightsMatch = url.match(/wght@([\d,;]+)/);
                const weights = weightsMatch ? weightsMatch[1].split(/[;,]/).filter(Boolean) : ["400", "700"];
                setForm((p) => ({
                  ...p,
                  name,
                  fontFamily: `'${name}', ${p.fallback || "sans-serif"}`,
                  weights: weights.slice(0, 6),
                  category: name.toLowerCase().includes("serif") && !name.toLowerCase().includes("sans") ? "serif" : "sans-serif",
                }));
              }} className="px-3 py-2 rounded-lg bg-ember/20 text-ember text-xs font-bold hover:bg-ember/30 border border-ember/30 transition-all whitespace-nowrap">Parse URL</button>
            </div>
            {form.googleFontUrl && !form.googleFontUrl.includes("family=") && (
              <p className="text-[10px] text-rose-400 mt-1">URL doesn't look like a Google Fonts URL (missing ?family=)</p>
            )}
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">Fallback</label>
            <input value={form.fallback} onChange={(e) => setForm({ ...form, fallback: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="sans-serif" />
          </div>

          <div>
            <label className="text-label text-white/60 block mb-2">Available Weights</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_WEIGHTS.map((w) => (
                <button key={w} type="button" onClick={() => toggleWeight(w)} className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${form.weights.includes(w) ? "bg-ember text-ink font-bold" : "bg-surface border hairline-border text-white/50 hover:text-white"}`}>{w}</button>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div>
            <label className="text-label text-white/60 block mb-1">Preview</label>
            <div className="p-4 rounded-lg bg-ink border hairline-border space-y-1">
              <p className="text-lg" style={{ fontFamily: form.fontFamily, fontWeight: 800 }}>The quick brown fox jumps over the lazy dog 123</p>
              <p style={{ fontFamily: form.fontFamily, fontWeight: 600 }}>The quick brown fox jumps over the lazy dog 123</p>
              <p className="text-sm" style={{ fontFamily: form.fontFamily, fontWeight: 400 }}>The quick brown fox jumps over the lazy dog 123</p>
            </div>
          </div>

          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold hover:brightness-110 transition-all">
            <Save className="w-4 h-4" /> {editing ? "Update" : "Create"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {fonts.map((f) => (
          <ContentListCard
            key={f.id}
            title={f.name}
            subtitle={`${f.category} · ${f.weights.length} weights · ${f.weights.join(", ")}`}
            isActive
            onEdit={() => startEdit(f)}
            onToggleActive={() => {}}
            onDelete={() => setDeleteTarget(f.id)}
            preview={
              <div className="w-full h-full flex items-center justify-center p-1" style={{ fontFamily: f.fontFamily }}>
                <div className="text-center">
                  <p className="text-[10px] font-black leading-tight truncate w-full">Aa</p>
                  <p className="text-[7px] text-white/40 mt-0.5">{f.fontFamily.split(",")[0].replace(/['"]/g, "")}</p>
                </div>
              </div>
            }
          />
        ))}
        {fonts.length === 0 && <p className="text-sm text-white/30 text-center py-8">No fonts defined.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Font" message="Remove this font from the library?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
