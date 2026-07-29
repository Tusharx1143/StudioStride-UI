/**
 * Stock Photo admin manager — thumbnail grid + upload form.
 *
 * For simplicity during Phase 4, this stores external URLs directly
 * rather than uploading to Firebase Storage (full storage upload flow
 * is added once Firebase is connected).
 */

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import type { PhotoSource } from "../../types";
import type { StockPhotoFormData } from "../../types/content";
import { getStockPhotos, deleteStockPhoto } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X, Upload } from "lucide-react";

const CATEGORIES = ["Stock Running", "Cycling & Trails", "Track & Night", "Preset Gradients", "Minimal"];

const emptyForm = (): StockPhotoFormData => ({
  name: "",
  category: "Stock Running",
});

export default function StockPhotoManager() {
  const [photos, setPhotos] = useState<PhotoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<StockPhotoFormData>(emptyForm());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStockPhotos();
      setPhotos(data);
    } catch (err) {
      console.error("Failed to load stock photos", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm({ ...form, file });
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    // Full upload flow when Firebase Storage is connected
    // For now, just refresh the list
    await load();
    setCreating(false);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStockPhoto(deleteTarget);
      await load();
    } catch (err) {
      console.error("Failed to delete stock photo", err);
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
          <h2 className="text-section-header">Stock Photos</h2>
          <p className="text-body text-white/40 text-sm">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> New Photo
          </button>
        )}
      </div>

      {/* Upload form */}
      {creating && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">New Stock Photo</h3>
            <button type="button" onClick={() => { setCreating(false); setPreviewUrl(null); }} className="p-1 rounded-lg hover:bg-surface-overlay transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label text-white/60 block mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Mountain Sunrise" />
            </div>
            <div>
              <label className="text-label text-white/60 block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="text-label text-white/60 block mb-1">Image</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center h-32 rounded-xl bg-surface border-2 border-dashed hairline-border cursor-pointer hover:border-ember/50 transition-colors"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-full rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/30">
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Click to upload image</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>

          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold hover:brightness-110 transition-all">
            <Save className="w-4 h-4" /> Save Photo
          </button>
        </form>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {photos.map((p) => (
          <div key={p.id} className="group relative rounded-xl overflow-hidden bg-surface-raised border hairline-border aspect-[3/4]">
            <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-xs font-medium text-white truncate">{p.name}</p>
                <p className="text-[10px] text-white/50 truncate">{p.category}</p>
              </div>
              <button
                onClick={() => setDeleteTarget(p.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white/70 hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {photos.length === 0 && <p className="text-sm text-white/30 text-center py-8 col-span-3">No stock photos defined.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Photo" message="Are you sure you want to delete this stock photo? This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
