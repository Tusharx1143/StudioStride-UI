import { useState, useEffect, useCallback } from "react";
import type { TemplateFamily, LensTemplate, PhotoSource } from "../../types";
import type { StickerItem, FirestoreFont, FirestoreColorPalette } from "../../types/content";
import { getTemplateFamilies, deleteTemplateFamily } from "../../services/contentService";
import { getLensTemplates, deleteLensTemplate } from "../../services/contentService";
import { getStickers, deleteSticker } from "../../services/contentService";
import { getStockPhotos, deleteStockPhoto } from "../../services/contentService";
import { getFonts, deleteFont } from "../../services/contentService";
import { getColorPalettes, deleteColorPalette } from "../../services/contentService";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Eye, EyeOff, Trash2, LayoutTemplate, Camera, Sticker, Type, Palette, Image as ImageIcon } from "lucide-react";

type Group = "lenses" | "templates" | "stickers" | "fonts" | "colors" | "photos";

const GROUPS: { key: Group; label: string; icon: typeof Eye }[] = [
  { key: "lenses", label: "Lens Overlays", icon: Camera },
  { key: "templates", label: "Template Families", icon: LayoutTemplate },
  { key: "stickers", label: "Stickers", icon: Sticker },
  { key: "fonts", label: "Fonts", icon: Type },
  { key: "colors", label: "Color Palettes", icon: Palette },
  { key: "photos", label: "Stock Photos", icon: ImageIcon },
];

type AnyItem = { id: string; name?: string; title?: string; label?: string; isActive: boolean };

export default function Published() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, AnyItem[]>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<Group | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lenses, templates, stickers, fonts, palettes, photos] = await Promise.all([
        getLensTemplates(), getTemplateFamilies(), getStickers(),
        getFonts(), getColorPalettes(), getStockPhotos(),
      ]);
      setData({
        lenses: lenses.map(l => ({ id: l.id, name: `${l.icon} ${l.name}`, isActive: true })),
        templates: templates.map(t => ({ id: t.id, name: `${t.icon} ${t.name}`, isActive: true })),
        stickers: stickers.map(s => ({ id: s.id, name: s.label, isActive: true })),
        fonts: fonts.map(f => ({ id: f.id, title: f.name, isActive: true })),
        colors: palettes.map(p => ({ id: p.id, title: p.name, isActive: true })),
        photos: photos.map(p => ({ id: p.id, title: p.name, isActive: true })),
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget || !deleteType) return;
    try {
      if (deleteType === "lenses") await deleteLensTemplate(deleteTarget);
      if (deleteType === "templates") await deleteTemplateFamily(deleteTarget);
      if (deleteType === "stickers") await deleteSticker(deleteTarget);
      if (deleteType === "fonts") await deleteFont(deleteTarget);
      if (deleteType === "colors") await deleteColorPalette(deleteTarget);
      if (deleteType === "photos") await deleteStockPhoto(deleteTarget);
      await load();
    } catch (err) { console.error(err); }
    setDeleteTarget(null); setDeleteType(null);
  };

  const toggleGroup = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-section-header">Published</h2>
        <p className="text-body text-white/40 text-sm">Everything live in the app — toggle visibility, delete, or drill into</p>
      </div>

      <div className="space-y-3">
        {GROUPS.map((group) => {
          const items = data[group.key] || [];
          const open = expanded[group.key] !== false;
          return (
            <div key={group.key} className="rounded-xl bg-surface-raised border hairline-border overflow-hidden">
              {/* Group header */}
              <button onClick={() => toggleGroup(group.key)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-overlay transition-colors">
                <div className="flex items-center gap-3">
                  <group.icon className="w-4 h-4 text-ember" />
                  <span className="text-sm font-bold text-white">{group.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${items.length > 0 ? "bg-success/10 text-success" : "bg-white/5 text-white/30"}`}>
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <span className="text-[10px] text-white/30">{open ? "▲" : "▼"}</span>
              </button>

              {/* Items */}
              {open && (
                <div className="border-t hairline-border divide-y hairline-border">
                  {items.length === 0 && (
                    <div className="px-4 py-6 text-center text-xs text-white/20">Nothing published yet.</div>
                  )}
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-overlay/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.isActive ? "bg-success" : "bg-white/20"}`} />
                        <span className="text-xs text-white/80 truncate">{item.name || item.title || item.label || item.id}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button className="p-1.5 rounded-lg hover:bg-surface-overlay text-white/30 hover:text-amber-400 transition-colors" title={item.isActive ? "Deactivate" : "Activate"}>
                          {item.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => { setDeleteTarget(item.id); setDeleteType(group.key); }} className="p-1.5 rounded-lg hover:bg-surface-overlay text-white/30 hover:text-danger transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete" message="Remove this item permanently?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
