/**
 * Sticker admin manager — list + create/edit form with gradient pill preview.
 */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { StickerFormData, StickerItem } from "../../types/content";
import { getStickers, createSticker, updateSticker, deleteSticker } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X } from "lucide-react";

const DEFAULT_GRADIENTS = [
  "from-ember to-ember-lift text-ink",
  "from-sky-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-orange-600 to-red-500",
  "from-cyan-500 to-blue-600",
  "from-yellow-400 to-amber-600",
  "from-emerald-600 to-green-500",
  "from-indigo-600 to-blue-500",
  "from-rose-600 to-orange-500",
  "from-purple-600 to-pink-500",
];

const CATEGORIES = ["Badges", "Stats", "Locations"];
const TYPES = ["badge", "metric", "location", "emoji"];

const emptyForm = (): StickerFormData => ({
  content: "",
  label: "",
  category: "Badges",
  type: "badge",
  bgGradient: DEFAULT_GRADIENTS[0],
  statKey: "",
});

export default function StickerManager() {
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string; data: StickerFormData } | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<StickerFormData>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStickers();
      setStickers(data);
    } catch (err) {
      console.error("Failed to load stickers", err);
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

  const startEdit = (item: StickerItem) => {
    setForm({
      content: item.content,
      label: item.label,
      category: item.category,
      type: item.type,
      bgGradient: item.bgGradient,
      statKey: item.statKey,
    });
    setEditing({ id: item.id, data: item });
    setCreating(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.content || !form.label) return;

    try {
      if (editing) {
        await updateSticker(editing.id, form);
      } else {
        await createSticker(form);
      }
      await load();
      setCreating(false);
      setEditing(null);
    } catch (err) {
      console.error("Failed to save sticker", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSticker(deleteTarget);
      await load();
    } catch (err) {
      console.error("Failed to delete sticker", err);
    }
    setDeleteTarget(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header">Stickers</h2>
          <p className="text-body text-white/40 text-sm">{stickers.length} sticker{stickers.length !== 1 ? "s" : ""}</p>
        </div>
        {!creating && !editing && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> New Sticker
          </button>
        )}
      </div>

      {/* Form */}
      {(creating || editing) && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{editing ? "Edit Sticker" : "New Sticker"}</h3>
            <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-surface-overlay transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label text-white/60 block mb-1">Label</label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" />
            </div>
            <div>
              <label className="text-label text-white/60 block mb-1">Content Text</label>
              <input value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="BEAST MODE 🔥" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label text-white/60 block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label text-white/60 block mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">BG Gradient</label>
            <select value={form.bgGradient} onChange={(e) => setForm({ ...form, bgGradient: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
              {DEFAULT_GRADIENTS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">Stat Key (optional)</label>
            <input value={form.statKey ?? ""} onChange={(e) => setForm({ ...form, statKey: e.target.value || undefined })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="distance / pace / time / title" />
          </div>

          {/* Live preview */}
          {form.bgGradient && (
            <div>
              <label className="text-label text-white/60 block mb-1">Preview</label>
              <span className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${form.bgGradient} text-xs font-bold uppercase tracking-wider`}>
                {form.content || "PREVIEW"}
              </span>
            </div>
          )}

          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold hover:brightness-110 transition-all">
            <Save className="w-4 h-4" /> {editing ? "Update" : "Create"}
          </button>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {stickers.map((s) => (
          <ContentListCard
            key={s.id}
            title={s.label}
            subtitle={`${s.category} · ${s.type}${s.statKey ? ` · ${s.statKey}` : ""}`}
            isActive
            onEdit={() => startEdit(s)}
            onToggleActive={() => {}}
            onDelete={() => setDeleteTarget(s.id)}
            preview={
              <div className="w-full h-full flex items-center justify-center">
                <span className={`inline-block px-2 py-1 rounded-full bg-gradient-to-r ${s.bgGradient ?? "from-gray-500 to-gray-600"} text-[8px] font-bold uppercase tracking-wider text-white`}>
                  {s.content.slice(0, 8)}
                </span>
              </div>
            }
          />
        ))}
        {stickers.length === 0 && <p className="text-sm text-white/30 text-center py-8">No stickers defined.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Sticker" message="Are you sure you want to delete this sticker? This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
