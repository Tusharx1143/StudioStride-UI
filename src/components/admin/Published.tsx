import { useState, useEffect, useCallback } from "react";
import {
  getGroupItems,
  setGroupItemActive,
  deleteGroupItem,
  type ContentGroup,
  type AdminContentItem,
} from "../../services/contentService";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Eye, EyeOff, Trash2, LayoutTemplate, Camera, Sticker, Type, Palette, Image as ImageIcon } from "lucide-react";

const GROUPS: { key: ContentGroup; label: string; icon: typeof Eye }[] = [
  { key: "lenses", label: "Lens Overlays", icon: Camera },
  { key: "templates", label: "Template Families", icon: LayoutTemplate },
  { key: "stickers", label: "Stickers", icon: Sticker },
  { key: "fonts", label: "Fonts", icon: Type },
  { key: "colors", label: "Color Palettes", icon: Palette },
  { key: "photos", label: "Stock Photos", icon: ImageIcon },
];

export default function Published() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Partial<Record<ContentGroup, AdminContentItem[]>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ group: ContentGroup; item: AdminContentItem } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await Promise.all(
        GROUPS.map(async (g) => [g.key, await getGroupItems(g.key)] as const)
      );
      setData(Object.fromEntries(entries));
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Flip publish state, showing the new state immediately and rolling back on failure. */
  const toggleActive = async (group: ContentGroup, item: AdminContentItem) => {
    const next = !item.isActive;
    setBusy(item.id);
    setData((p) => ({
      ...p,
      [group]: (p[group] ?? []).map((i) => i.id === item.id ? { ...i, isActive: next } : i),
    }));
    try {
      await setGroupItemActive(group, item.id, next);
    } catch (err) {
      console.error("Failed to change publish state", err);
      setData((p) => ({
        ...p,
        [group]: (p[group] ?? []).map((i) => i.id === item.id ? { ...i, isActive: item.isActive } : i),
      }));
    }
    setBusy(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGroupItem(deleteTarget.group, deleteTarget.item.id);
      await load();
    } catch (err) { console.error(err); }
    setDeleteTarget(null);
  };

  const toggleGroup = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-section-header">Published</h2>
        <p className="text-body text-white/40 text-sm">Everything in the library — hide an item from the app, or delete it for good</p>
      </div>

      <div className="space-y-3">
        {GROUPS.map((group) => {
          const items = data[group.key] ?? [];
          const liveCount = items.filter((i) => i.isActive).length;
          const open = expanded[group.key] !== false;
          return (
            <div key={group.key} className="rounded-xl bg-surface-raised border hairline-border overflow-hidden">
              {/* Group header */}
              <button onClick={() => toggleGroup(group.key)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-overlay transition-colors">
                <div className="flex items-center gap-3">
                  <group.icon className="w-4 h-4 text-ember" />
                  <span className="text-sm font-bold text-white">{group.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${liveCount > 0 ? "bg-success/10 text-success" : "bg-white/5 text-white/30"}`}>
                    {liveCount} live
                  </span>
                  {items.length > liveCount && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/30">
                      {items.length - liveCount} hidden
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/30">{open ? "▲" : "▼"}</span>
              </button>

              {/* Items */}
              {open && (
                <div className="border-t hairline-border divide-y hairline-border">
                  {items.length === 0 && (
                    <div className="px-4 py-6 text-center text-xs text-white/20">Nothing here yet.</div>
                  )}
                  {items.map((item) => (
                    <div key={item.id} className={`flex items-center justify-between px-4 py-2.5 hover:bg-surface-overlay/50 transition-colors ${item.isActive ? "" : "opacity-50"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.isActive ? "bg-success" : "bg-white/20"}`} />
                        <span className="text-xs text-white/80 truncate">{item.label}</span>
                        {!item.isActive && <span className="text-[9px] text-white/30 uppercase tracking-wider flex-shrink-0">Hidden</span>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleActive(group.key, item)}
                          disabled={busy === item.id}
                          className="p-1.5 rounded-lg hover:bg-surface-overlay text-white/30 hover:text-amber-400 transition-colors disabled:opacity-30"
                          title={item.isActive ? "Hide from app" : "Publish to app"}
                        >
                          {item.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ group: group.key, item })}
                          className="p-1.5 rounded-lg hover:bg-surface-overlay text-white/30 hover:text-danger transition-colors"
                          title="Delete permanently"
                        >
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete permanently"
        message={`"${deleteTarget?.item.label ?? ""}" will be removed for good. To just take it out of the app, use the eye icon instead.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
