/**
 * Lens filter admin manager — list + create/edit form.
 */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { LensFilterFormData } from "../../types/content";
import { getLensFilters, createLensFilter, updateLensFilter, deleteLensFilter } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X } from "lucide-react";

const FILTER_PREVIEW_IMG = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=200&auto=format&fit=crop";

export default function LensFilterManager() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string; data: LensFilterFormData } | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<LensFilterFormData>({ name: "", overlayType: "", filterCSS: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLensFilters();
      setFilters(data);
    } catch (err) {
      console.error("Failed to load filters", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ name: "", overlayType: "", filterCSS: "" });

  const startCreate = () => {
    resetForm();
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (id: string, data: LensFilterFormData) => {
    setForm(data);
    setEditing({ id, data });
    setCreating(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.filterCSS) return;

    try {
      if (editing) {
        await updateLensFilter(editing.id, form);
      } else {
        await createLensFilter(form);
      }
      await load();
      setCreating(false);
      setEditing(null);
    } catch (err) {
      console.error("Failed to save filter", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLensFilter(deleteTarget);
      await load();
    } catch (err) {
      console.error("Failed to delete filter", err);
    }
    setDeleteTarget(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;
  }

  const filterEntries = Object.entries(filters);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header">Lens Filters</h2>
          <p className="text-body text-white/40 text-sm">{filterEntries.length} filter{filterEntries.length !== 1 ? "s" : ""}</p>
        </div>
        {!creating && !editing && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> New Filter
          </button>
        )}
      </div>

      {/* Form */}
      {(creating || editing) && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{editing ? "Edit Filter" : "New Filter"}</h3>
            <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-surface-overlay transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label text-white/60 block mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Vintage Warmth" />
            </div>
            <div>
              <label className="text-label text-white/60 block mb-1">Overlay Type</label>
              <input value={form.overlayType} onChange={(e) => setForm({ ...form, overlayType: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="vintage" />
            </div>
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">CSS Filter</label>
            <input value={form.filterCSS} onChange={(e) => setForm({ ...form, filterCSS: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="sepia(0.4) contrast(0.9) brightness(0.9)" />
          </div>

          {/* Live preview */}
          {form.filterCSS && (
            <div>
              <label className="text-label text-white/60 block mb-1">Preview</label>
              <img src={FILTER_PREVIEW_IMG} alt="Filter preview" className="w-40 h-28 rounded-lg object-cover" style={{ filter: form.filterCSS }} />
            </div>
          )}

          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold hover:brightness-110 transition-all">
            <Save className="w-4 h-4" /> {editing ? "Update" : "Create"}
          </button>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {filterEntries.map(([id, filterCSS]) => (
          <ContentListCard
            key={id}
            title={id}
            subtitle={filterCSS}
            isActive
            onEdit={() => startEdit(id, { name: id, overlayType: id, filterCSS })}
            onToggleActive={() => {}}
            onDelete={() => setDeleteTarget(id)}
            preview={
              <img src={FILTER_PREVIEW_IMG} alt="" className="w-full h-full object-cover" style={{ filter: filterCSS }} />
            }
          />
        ))}
        {filterEntries.length === 0 && <p className="text-sm text-white/30 text-center py-8">No filters defined.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Filter" message="Are you sure you want to delete this filter? This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
