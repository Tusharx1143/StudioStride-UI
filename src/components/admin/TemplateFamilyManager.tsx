/**
 * Template Family admin — identity and stat design in one editor.
 *
 * These were two screens: a family (name, icon, accent) over here, and its
 * stat design (typography, layout) over there, keyed by the family's id. A
 * template is not usable until both exist, so editing them apart meant
 * round-tripping between screens to judge one result — and the family screen's
 * "preview" was hardcoded numbers that reflected none of the design.
 *
 * Now the form sits beside a live preview rendered by `StatLayer`, the same
 * component the editor and exporter use, so what an admin approves here is
 * what a creator gets.
 */

import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from "react";
import type {
  ChartSlotId,
  ChartStyle,
  TemplateFamily,
  TextSlotId,
  StatData,
  SlotPosition,
} from "../../types";
import type {
  TemplateFamilyFormData,
  StorableSlotStyle,
  StorableTemplateStatDesign,
} from "../../types/content";
import {
  getTemplateFamilies,
  createTemplateFamily,
  updateTemplateFamily,
  deleteTemplateFamily,
  getStatDesignDocs,
  createStatDesign,
  updateStatDesign,
  resolveStatDesign,
  getFonts,
} from "../../services/contentService";
import { FORMATTER_OPTIONS } from "../../data/formatterRegistry";
import { ACCENT_OPTIONS } from "../../data/accentRegistry";
import {
  CHART_OPTIONS,
  CHART_SLOTS_FOR,
  defaultChartStyle,
  isDecorativeSlot,
} from "../../data/chartRegistry";
import { toRouteGeometry } from "../../utils/routeGeometry";
import { BUILT_IN_FONTS } from "../../data/builtInFonts";
import StatLayer from "../StatLayer";
import ContentListCard from "./shared/ContentListCard";
import ConfirmDialog from "./shared/ConfirmDialog";
import { Plus, Save, X, Eye } from "lucide-react";

const CATEGORIES = ["Bold", "Classic", "Clean", "Modern", "Tech", "Gaming", "Maps", "Vintage", "Premium", "Art", "Social", "Dynamic", "Utility"];
const SLOT_IDS: TextSlotId[] = ["distance", "pace", "time", "title"];
const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900];
const FONT_COLORS = ["#FFFFFF", "#F4E409", "#FF7A1A", "#22D3EE", "#34D399", "#A78BFA", "#F472B6", "#FF4D3D", "#000000"];

/** Where a slot lands if the design never said. */
const FALLBACK_POS: Record<TextSlotId, SlotPosition> = {
  distance: { x: 6, y: 58 },
  pace: { x: 6, y: 72 },
  time: { x: 40, y: 72 },
  title: { x: 6, y: 86 },
};

/** Where a chart lands when it is first added — clear of the stat block. */
const FALLBACK_CHART_POS: Record<ChartSlotId, SlotPosition> = {
  route: { x: 22, y: 20 },
  splits: { x: 6, y: 40 },
  ruleTop: { x: 8, y: 20 },
  ruleBottom: { x: 8, y: 74 },
};

/**
 * A colour an `<input type="color">` will accept.
 *
 * Chart colours are often authored as rgba — a translucent bar track is the
 * normal case — and the native picker only takes 6-digit hex, so anything else
 * falls back rather than silently resetting the field to black.
 */
function hexOf(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff";
}

/**
 * Stand-in activity, so the preview reads like a real card.
 *
 * Carries a route and splits as well as the core stats — without them a chart
 * slot's `available` returns false and the admin authors against a blank box.
 */
const SAMPLE: StatData = {
  distance: 8.42,
  distanceUnit: "km",
  pace: "6:12",
  time: "52:18",
  title: "Morning Run",
  route: toRouteGeometry([
    [45.0, -73.6],
    [45.04, -73.52],
    [45.09, -73.48],
    [45.07, -73.41],
    [45.02, -73.44],
    [44.98, -73.53],
    [45.0, -73.6],
  ]) ?? undefined,
  splits: [372, 366, 381, 358, 370, 349, 377, 362].map((pace, i) => ({
    index: i + 1,
    distanceMeters: 1000,
    elapsed: pace,
    paceSecondsPerKm: pace,
  })),
};

const emptyFamily = (): TemplateFamilyFormData => ({
  name: "",
  category: "Clean",
  icon: "◻️",
  tagline: "",
  accentColor: "#FFFFFF",
});

const emptyDesign = (templateFamilyId: string): StorableTemplateStatDesign => ({
  templateFamilyId,
  slots: {},
  defaultLayout: {},
  accentType: "none",
});

function defaultSlotStyle(accentColor: string, slot: TextSlotId): StorableSlotStyle {
  const isHero = slot === "distance";
  return {
    textFormatter: slot === "distance" ? "dist2" : slot,
    fontFamily: "'Archivo', sans-serif",
    fontSize: isHero ? 36 : 14,
    fontWeight: isHero ? 900 : 600,
    color: isHero ? accentColor : "#FFFFFFCC",
  };
}

export default function TemplateFamilyManager() {
  const [families, setFamilies] = useState<TemplateFamily[]>([]);
  const [designs, setDesigns] = useState<Record<string, StorableTemplateStatDesign>>({});
  const [fontFamilies, setFontFamilies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<TemplateFamilyFormData>(emptyFamily());
  const [design, setDesign] = useState<StorableTemplateStatDesign>(emptyDesign(""));
  const [selectedSlot, setSelectedSlot] = useState<TextSlotId>("distance");

  const previewRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fams, docs, fonts] = await Promise.all([
        getTemplateFamilies(),
        getStatDesignDocs(),
        getFonts(),
      ]);
      setFamilies(fams);
      setDesigns(docs);
      setFontFamilies([
        ...new Set([...BUILT_IN_FONTS.map((f) => f.fontFamily), ...fonts.map((f) => f.fontFamily)]),
      ]);
    } catch (err) {
      console.error("Failed to load template families", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setForm(emptyFamily());
    setDesign(emptyDesign(""));
    setSelectedSlot("distance");
    setCreating(true);
    setEditingId(null);
  };

  const startEdit = (tf: TemplateFamily) => {
    setForm({
      name: tf.name,
      category: tf.category,
      icon: tf.icon,
      tagline: tf.tagline,
      accentColor: tf.accentColor,
    });
    // Load the stored design rather than a blank one — the old screen built a
    // storable here, threw it away, and always started empty, so saving an
    // existing design overwrote it with defaults.
    setDesign(designs[tf.id] ?? emptyDesign(tf.id));
    setSelectedSlot("distance");
    setEditingId(tf.id);
    setCreating(false);
  };

  const closeEditor = () => { setCreating(false); setEditingId(null); };

  const updateSlot = (slot: TextSlotId, updates: Partial<StorableSlotStyle>) => {
    setDesign((prev) => ({
      ...prev,
      slots: {
        ...prev.slots,
        [slot]: { ...(prev.slots[slot] ?? defaultSlotStyle(form.accentColor, slot)), ...updates },
      },
    }));
  };

  /**
   * Adds a chart into the first free slot its primitive accepts.
   *
   * Most primitives have exactly one; a rule has two, so a template can carry
   * both a top and a bottom perforation.
   */
  const addChart = (chart: string) => {
    const candidates = CHART_SLOTS_FOR[chart] ?? [];
    const slot = candidates.find((s) => !design.charts?.[s]) ?? candidates[0];
    if (!slot) return;

    setDesign((prev) => ({
      ...prev,
      charts: { ...prev.charts, [slot]: defaultChartStyle(chart, form.accentColor) },
      defaultLayout: {
        ...prev.defaultLayout,
        [slot]: prev.defaultLayout[slot] ?? FALLBACK_CHART_POS[slot],
      },
    }));
  };

  const updateChart = (slot: ChartSlotId, updates: Partial<ChartStyle>) => {
    setDesign((prev) => {
      const current = prev.charts?.[slot];
      if (!current) return prev;
      return { ...prev, charts: { ...prev.charts, [slot]: { ...current, ...updates } } };
    });
  };

  const updateChartOption = (
    slot: ChartSlotId,
    key: string,
    value: string | number | boolean
  ) => {
    setDesign((prev) => {
      const current = prev.charts?.[slot];
      if (!current) return prev;
      return {
        ...prev,
        charts: {
          ...prev.charts,
          [slot]: { ...current, options: { ...current.options, [key]: value } },
        },
      };
    });
  };

  /** Drops the chart, its position, and any requirement that named it. */
  const removeChart = (slot: ChartSlotId) => {
    setDesign((prev) => {
      const charts = { ...prev.charts };
      delete charts[slot];
      const defaultLayout = { ...prev.defaultLayout };
      delete defaultLayout[slot];
      return {
        ...prev,
        charts,
        defaultLayout,
        requires: (prev.requires ?? []).filter((s) => s !== slot),
      };
    });
  };

  const toggleRequires = (slot: ChartSlotId, required: boolean) => {
    setDesign((prev) => {
      const current = prev.requires ?? [];
      return {
        ...prev,
        requires: required
          ? current.includes(slot)
            ? current
            : [...current, slot]
          : current.filter((s) => s !== slot),
      };
    });
  };

  const toggleSlot = (slot: TextSlotId) => {
    setDesign((prev) => {
      const slots = { ...prev.slots };
      const layout = { ...prev.defaultLayout };
      if (slots[slot]) {
        delete slots[slot];
        delete layout[slot];
      } else {
        slots[slot] = defaultSlotStyle(form.accentColor, slot);
        layout[slot] = FALLBACK_POS[slot];
      }
      return { ...prev, slots, defaultLayout: layout };
    });
    setSelectedSlot(slot);
  };

  const moveSlot = (slot: TextSlotId, axis: "x" | "y", value: number) => {
    setDesign((prev) => {
      const pos = prev.defaultLayout[slot] ?? FALLBACK_POS[slot];
      return { ...prev, defaultLayout: { ...prev.defaultLayout, [slot]: { ...pos, [axis]: value } } };
    });
  };

  /** The in-progress design, resolved for the same renderer the app uses. */
  const previewDesign = useMemo(() => resolveStatDesign(design), [design]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || saving) return;
    setSaving(true);
    try {
      // The design is keyed by the family id, which a new family only gets on
      // create — so the family is always written first.
      const familyId = editingId ?? (await createTemplateFamily(form)).id;
      if (editingId) await updateTemplateFamily(editingId, form);

      // A chart-only design has no text slots at all, so gating the save on
      // slots alone would silently discard it.
      const hasContent =
        Object.keys(design.slots).length > 0 ||
        Object.keys(design.charts ?? {}).length > 0;
      if (hasContent) {
        const payload = {
          ...design,
          templateFamilyId: familyId,
          accentType: design.accentType ?? "none",
        };
        if (designs[familyId]) {
          await updateStatDesign(familyId, payload);
        } else {
          await createStatDesign(payload);
        }
      }

      await load();
      closeEditor();
    } catch (err) {
      console.error("Failed to save template", err);
    }
    setSaving(false);
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

  const currentStyle = design.slots[selectedSlot];
  const configuredCount = Object.keys(design.slots).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header">Templates</h2>
          <p className="text-body text-white/40 text-sm">
            {families.length} template{families.length !== 1 ? "s" : ""} · identity and stat design together
          </p>
        </div>
        {!creating && !editingId && (
          <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-raised border hairline-border">
            <h3 className="text-sm font-bold text-white">{editingId ? "Edit Template" : "New Template"}</h3>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={!form.name || saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-ink text-sm font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={closeEditor} className="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </div>

          {/* Form on the left, live preview pinned on the right. */}
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              {/* ── Identity ── */}
              <div className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-3">
                <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Identity</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Hero" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-[4rem_1fr] gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Icon</label>
                    <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-2 py-2 rounded-lg bg-surface border hairline-border text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="🦸" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Tagline</label>
                    <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-ember/50" placeholder="Bold hero layout with oversized metrics" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Accent colour</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="w-10 h-9 rounded-lg border hairline-border cursor-pointer bg-surface" />
                    <input value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-surface border hairline-border text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/50" />
                  </div>
                </div>
              </div>

              {/* ── Stat design ── */}
              <div className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Stat design</span>
                  <span className="text-[10px] text-white/30">{configuredCount} of {SLOT_IDS.length} stats shown</span>
                </div>

                {/* Which stats this template shows at all. */}
                <div className="flex flex-wrap gap-1.5">
                  {SLOT_IDS.map((slot) => {
                    const on = !!design.slots[slot];
                    return (
                      <button key={slot} type="button" onClick={() => toggleSlot(slot)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                          on ? "bg-ember/15 text-ember border border-ember/30" : "bg-surface border hairline-border text-white/30 hover:text-white/60"
                        }`}>
                        {on ? "✓ " : "+ "}{slot}
                      </button>
                    );
                  })}
                </div>

                {configuredCount === 0 && (
                  <p className="text-[11px] text-white/30 py-2">
                    Add a stat above to design it. A template with no stats falls back to the built-in layout.
                  </p>
                )}

                {configuredCount > 0 && (
                  <>
                    {/* Which one you're styling. */}
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t hairline-border">
                      {SLOT_IDS.filter((s) => design.slots[s]).map((slot) => (
                        <button key={slot} type="button" onClick={() => setSelectedSlot(slot)}
                          className={`px-3 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider transition-colors ${
                            selectedSlot === slot ? "bg-ember text-ink" : "bg-surface text-white/50 hover:text-white"
                          }`}>
                          {slot}
                        </button>
                      ))}
                    </div>

                    {currentStyle ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">Value shown</label>
                            <select value={currentStyle.textFormatter} onChange={(e) => updateSlot(selectedSlot, { textFormatter: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs">
                              {FORMATTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">Font</label>
                            <select value={currentStyle.fontFamily} onChange={(e) => updateSlot(selectedSlot, { fontFamily: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs">
                              {[...new Set([currentStyle.fontFamily, ...fontFamilies])].map((f) => (
                                <option key={f} value={f}>{f.split(",")[0].replace(/['"]/g, "")}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">Size</label>
                            <input type="number" value={currentStyle.fontSize} onChange={(e) => updateSlot(selectedSlot, { fontSize: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs" min={8} max={80} />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">Weight</label>
                            <select value={currentStyle.fontWeight} onChange={(e) => updateSlot(selectedSlot, { fontWeight: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs">
                              {FONT_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">Tracking</label>
                            <input type="number" value={currentStyle.letterSpacing ?? 0} onChange={(e) => updateSlot(selectedSlot, { letterSpacing: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs" min={-3} max={10} step={0.5} />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-white/40 block mb-1">Colour</label>
                          <div className="flex gap-1.5 flex-wrap items-center">
                            {FONT_COLORS.map((c) => (
                              <button key={c} type="button" onClick={() => updateSlot(selectedSlot, { color: c })}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${currentStyle.color === c ? "border-white scale-110" : "border-transparent"}`}
                                style={{ backgroundColor: c }} />
                            ))}
                            <button type="button" onClick={() => updateSlot(selectedSlot, { color: form.accentColor })}
                              className="px-2 py-1 rounded text-[10px] bg-surface border hairline-border text-white/50 hover:text-white">
                              Use accent
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">Position X %</label>
                            <input type="number" value={(design.defaultLayout[selectedSlot] ?? FALLBACK_POS[selectedSlot]).x}
                              onChange={(e) => moveSlot(selectedSlot, "x", Number(e.target.value))}
                              className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs" min={0} max={100} />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">Position Y %</label>
                            <input type="number" value={(design.defaultLayout[selectedSlot] ?? FALLBACK_POS[selectedSlot]).y}
                              onChange={(e) => moveSlot(selectedSlot, "y", Number(e.target.value))}
                              className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs" min={0} max={100} />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                            <input type="checkbox" checked={currentStyle.italic ?? false} onChange={(e) => updateSlot(selectedSlot, { italic: e.target.checked })} className="rounded border-white/20 bg-surface" />
                            Italic
                          </label>
                          <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                            <input type="checkbox" checked={currentStyle.uppercase ?? false} onChange={(e) => updateSlot(selectedSlot, { uppercase: e.target.checked })} className="rounded border-white/20 bg-surface" />
                            Uppercase
                          </label>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">Accent decoration</label>
                      <select value={design.accentType} onChange={(e) => setDesign({ ...design, accentType: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs">
                        {ACCENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    {/* Chart slots — a template that draws a series, not just type. */}
                    <div className="pt-2 border-t hairline-border">
                      <label className="text-[10px] text-white/40 block mb-1">Chart slot</label>
                      <select
                        value=""
                        onChange={(e) => e.target.value && addChart(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface border hairline-border text-white text-xs"
                      >
                        <option value="">Add a chart…</option>
                        {CHART_OPTIONS.filter((o) => o.value !== "none").map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>

                      {(Object.keys(design.charts ?? {}) as ChartSlotId[]).map((slot) => {
                        const chart = design.charts![slot]!;
                        const isRoute = slot === "route";
                        const isRule = isDecorativeSlot(slot);
                        return (
                          <div key={slot} className="mt-2 p-2 rounded-lg bg-surface border hairline-border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] text-white/80 font-medium">
                                {CHART_OPTIONS.find((o) => o.value === chart.chart)?.label ?? chart.chart}
                              </span>
                              <button type="button" onClick={() => removeChart(slot)} className="text-white/40 hover:text-white text-[10px]">Remove</button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <label className="text-[10px] text-white/40">Width
                                <input type="number" value={chart.width} onChange={(e) => updateChart(slot, { width: Number(e.target.value) })} className="w-full mt-0.5 px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" />
                              </label>
                              <label className="text-[10px] text-white/40">Height
                                <input type="number" value={chart.height} onChange={(e) => updateChart(slot, { height: Number(e.target.value) })} className="w-full mt-0.5 px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" />
                              </label>
                              <label className="text-[10px] text-white/40">Colour
                                <input type="color" value={hexOf(chart.color)} onChange={(e) => updateChart(slot, { color: e.target.value })} className="w-full mt-0.5 h-7 rounded bg-surface-raised border hairline-border" />
                              </label>
                              <label className="text-[10px] text-white/40">Accent
                                <input type="color" value={hexOf(chart.accentColor ?? chart.color)} onChange={(e) => updateChart(slot, { accentColor: e.target.value })} className="w-full mt-0.5 h-7 rounded bg-surface-raised border hairline-border" />
                              </label>
                            </div>

                            {isRule ? (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <label className="text-[10px] text-white/40">Thickness
                                  <input type="number" step="0.5" value={chart.strokeWidth ?? 1} onChange={(e) => updateChart(slot, { strokeWidth: Number(e.target.value) })} className="w-full mt-0.5 px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" />
                                </label>
                                <label className="text-[10px] text-white/40">Dash (0 = solid)
                                  <input type="number" value={Number(chart.options?.dash ?? 0)} onChange={(e) => updateChartOption(slot, "dash", Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" />
                                </label>
                                <label className="text-[10px] text-white/40">Gap
                                  <input type="number" value={Number(chart.options?.gap ?? chart.options?.dash ?? 0)} onChange={(e) => updateChartOption(slot, "gap", Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" />
                                </label>
                              </div>
                            ) : isRoute ? (
                              <div className="mt-2 space-y-1">
                                <label className="text-[10px] text-white/40 block">Stroke width
                                  <input type="number" step="0.5" value={chart.strokeWidth ?? 3} onChange={(e) => updateChart(slot, { strokeWidth: Number(e.target.value) })} className="w-full mt-0.5 px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" />
                                </label>
                                <label className="flex items-center gap-2 text-[10px] text-white/60 cursor-pointer">
                                  <input type="checkbox" checked={chart.options?.casing === true} onChange={(e) => updateChartOption(slot, "casing", e.target.checked)} className="rounded border-white/20 bg-surface" />
                                  Casing (dark stroke beneath — keeps it legible on a bright photo)
                                </label>
                                <label className="flex items-center gap-2 text-[10px] text-white/60 cursor-pointer">
                                  <input type="checkbox" checked={chart.options?.showStartDot === true} onChange={(e) => updateChartOption(slot, "showStartDot", e.target.checked)} className="rounded border-white/20 bg-surface" />
                                  Start dot
                                </label>
                                <label className="flex items-center gap-2 text-[10px] text-white/60 cursor-pointer">
                                  <input type="checkbox" checked={chart.options?.showEndDot === true} onChange={(e) => updateChartOption(slot, "showEndDot", e.target.checked)} className="rounded border-white/20 bg-surface" />
                                  End dot
                                </label>
                              </div>
                            ) : (
                              <div className="mt-2 space-y-1">
                                <label className="text-[10px] text-white/40 block">Max bars
                                  <input type="number" value={Number(chart.options?.maxBars ?? 12)} onChange={(e) => updateChartOption(slot, "maxBars", Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded bg-surface-raised border hairline-border text-white text-xs" />
                                </label>
                                <label className="flex items-center gap-2 text-[10px] text-white/60 cursor-pointer">
                                  <input type="checkbox" checked={chart.options?.highlightFastest === true} onChange={(e) => updateChartOption(slot, "highlightFastest", e.target.checked)} className="rounded border-white/20 bg-surface" />
                                  Highlight the fastest split
                                </label>
                              </div>
                            )}

                            {/* Decoration draws from its own style, so gating
                                the template on it would disable it forever. */}
                            {isRule ? null : (
                              <label className="flex items-center gap-2 mt-2 pt-2 border-t hairline-border text-[10px] text-white/60 cursor-pointer">
                                <input type="checkbox" checked={(design.requires ?? []).includes(slot)} onChange={(e) => toggleRequires(slot, e.target.checked)} className="rounded border-white/20 bg-surface" />
                                Required — hide this template when the activity has no {slot}
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="w-full lg:w-[300px] flex-shrink-0 lg:sticky lg:top-4">
              <div className="p-3 rounded-xl bg-surface-raised border hairline-border">
                <div className="flex items-center gap-1.5 mb-2 text-[10px] text-white/40">
                  <Eye className="w-3 h-3" /> Live preview — same renderer as the app
                </div>
                <div ref={previewRef} className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-ink">
                  <img
                    src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

                  <StatLayer
                    templateId={editingId ?? "preview"}
                    data={SAMPLE}
                    layout={design.defaultLayout}
                    design={previewDesign}
                    onLayoutChange={(next) => setDesign((p) => ({ ...p, defaultLayout: next }))}
                    constraintsRef={previewRef}
                    interactive={false}
                  />

                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1"
                    style={{ backgroundColor: form.accentColor + "22", color: form.accentColor, backdropFilter: "blur(8px)" }}>
                    <span>{form.icon || "◻️"}</span>
                    <span>{form.name || "Template"}</span>
                  </div>
                </div>
                {configuredCount === 0 && (
                  <p className="text-[10px] text-white/30 mt-2 text-center">No stats configured yet.</p>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {families.map((tf) => {
          const slotCount = Object.keys(designs[tf.id]?.slots ?? {}).length;
          return (
            <ContentListCard
              key={tf.id}
              title={`${tf.icon} ${tf.name}`}
              subtitle={`${tf.category} · ${slotCount > 0 ? `${slotCount} stats designed` : "no stat design"}`}
              isActive
              onEdit={() => startEdit(tf)}
              onToggleActive={() => {}}
              onDelete={() => setDeleteTarget(tf.id)}
              preview={
                <div className="w-full h-full relative flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
                  <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${tf.accentColor}88, transparent 60%)` }} />
                  <div className="relative flex flex-col items-center gap-0.5">
                    <span className="text-lg">{tf.icon}</span>
                    <span className="text-[7px] font-black uppercase tracking-wider" style={{ color: tf.accentColor }}>STATS</span>
                    <div className="flex gap-1">
                      <span className="text-[5px] font-bold" style={{ color: tf.accentColor + "99" }}>8.4</span>
                      <span className="text-[5px] font-bold text-white/50">6:12</span>
                    </div>
                  </div>
                </div>
              }
            />
          );
        })}
        {families.length === 0 && <p className="text-sm text-white/30 text-center py-8">No template families defined.</p>}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete Template" message="Are you sure you want to delete this template family? This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
