/**
 * Template Family admin manager — list + create/edit form.
 */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import type { TemplateFamily } from "../../types";
import type { TemplateFamilyFormData } from "../../types/content";
import { getTemplateFamilies, createTemplateFamily, updateTemplateFamily, deleteTemplateFamily } from "../../services/contentService";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X } from "lucide-react";

const CATEGORIES = ["Bold", "Classic", "Clean", "Modern", "Tech", "Gaming", "Maps", "Vintage", "Premium", "Art", "Social", "Dynamic", "Utility"];

const emptyForm = (): TemplateFamilyFormData => ({
  name: "",
  category: "Clean",
  icon: "◻️",
  tagline: "",
  accentColor: "#FFFFFF",
});

export default function TemplateFamilyManager() {
  const [families, setFamilies] = useState<TemplateFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string; data: TemplateFamilyFormData } | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFamilyFormData>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTemplateFamilies();
      setFamilies(data);
    } catch (err) {
      console.error("Failed to load template families", err);
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

  const startEdit = (tf: TemplateFamily) => {
    setForm({
      name: tf.name,
      category: tf.category,
      icon: tf.icon,
      tagline: tf.tagline,
      accentColor: tf.accentColor,
    });
    setEditing({ id: tf.id, data: form });
    setCreating(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    try {
      if (editing) {
        await updateTemplateFamily(editing.id, form);
      } else {
        await createTemplateFamily(form);
      }
      await load();
      setCreating(false);
      setEditing(null);
    } catch (err) {
      console.error("Failed to save template family", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplateFamily(deleteTarget);
      await load();
    } catch (err) {
      console.error("Failed to delete template family", err);
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
          <h2 className="text-section-header">Template Families</h2>
          <p className="text-body text-white/40 text-sm">{families.length} template{families.length !== 1 ? "s" : ""}</p>
        </div>
        {!creating && !editing && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {/* Form */}
      {(creating || editing) && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{editing ? "Edit Template" : "New Template"}</h3>
            <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-surface-overlay transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label text-white/60 block mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Hero" />
            </div>
            <div>
              <label className="text-label text-white/60 block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">Icon (emoji)</label>
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="🦸" />
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">Tagline</label>
            <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Bold hero layout with oversized metrics" />
          </div>

          <div>
            <label className="text-label text-white/60 block mb-1">Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="w-10 h-10 rounded-lg border hairline-border cursor-pointer bg-surface" />
              <input value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="#F4E409" />
            </div>
          </div>

          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold hover:brightness-110 transition-all">
            <Save className="w-4 h-4" /> {editing ? "Update" : "Create"}
          </button>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {families.map((tf) => (
          <ContentListCard
            key={tf.id}
            title={`${tf.icon} ${tf.name}`}
            subtitle={`${tf.category} · ${tf.tagline}`}
            isActive
            onEdit={() => startEdit(tf)}
            onToggleActive={() => {}}
            onDelete={() => setDeleteTarget(tf.id)}
            preview={
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: tf.accentColor + "20" }}>
                <span className="text-2xl">{tf.icon}</span>
              </div>
            }
          />
        ))}
        {families.length === 0 && <p className="text-sm text-white/30 text-center py-8">No template families defined.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Template" message="Are you sure you want to delete this template family? This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
