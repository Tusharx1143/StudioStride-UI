import type {
  MetricSlotId,
  MetricValue,
  SlotStyle,
  StatData,
  StatSlotId,
  StatSlotOverride,
  TemplateStatDesign,
  TextSlotId,
} from "../types";

/**
 * Metric slots — the stats a template did not author.
 *
 * `StatSlotId` used to be five values while `StravaActivity` already carried
 * elevation gain, calories, average and max heart rate, watts, suffer score,
 * max speed, kudos, and achievement count. All fetched, all discarded. A
 * typed `MetricOption[]` catalog sat in mockData imported by nothing.
 *
 * Templates cannot author a style for a slot they have never heard of, so a
 * metric borrows the template's own secondary-stat styling. That way the same
 * heart-rate chip looks like Hero inside Hero and like Editorial inside
 * Editorial, without nine templates each hand-listing thirty metrics.
 */

const PREFIX = "metric:";

export function metricSlot(metricId: string): MetricSlotId {
  return `${PREFIX}${metricId}`;
}

export function isMetricSlot(slot: StatSlotId): slot is MetricSlotId {
  return typeof slot === "string" && slot.startsWith(PREFIX);
}

/** The metric id inside a slot id, or null if this is a core slot. */
export function metricIdOf(slot: StatSlotId): string | null {
  return isMetricSlot(slot) ? slot.slice(PREFIX.length) : null;
}

/** The metric a slot points at, if the activity actually carries it. */
export function metricForSlot(slot: StatSlotId, data: StatData): MetricValue | null {
  const id = metricIdOf(slot);
  if (!id) return null;
  return data.metrics?.[id] ?? null;
}

/**
 * Slots worth borrowing a look from, smallest first.
 *
 * The template's *smallest* authored text is its supporting stat, which is
 * what a metric is. Picking by a fixed priority list breaks on templates like
 * Hero that author only a giant distance — the metric then renders at hero
 * size and shouts over the stat it is supporting.
 */
const STYLE_DONORS: TextSlotId[] = ["pace", "time", "title", "distance"];

/**
 * Ceiling for a borrowed size, in the 390px reference scale.
 *
 * A metric is additive detail. Even when the only thing to copy is a 72px
 * hero number, the chip stays legible-but-secondary.
 */
const MAX_METRIC_FONT_SIZE = 28;

function donorStyle(design: TemplateStatDesign): SlotStyle | null {
  const authored = STYLE_DONORS.map((slot) => design.slots[slot]).filter(
    (style): style is SlotStyle => Boolean(style)
  );

  if (authored.length === 0) return null;

  return authored.reduce((smallest, style) =>
    style.fontSize < smallest.fontSize ? style : smallest
  );
}

/**
 * The style to typeset a slot with, for both the DOM preview and the canvas
 * export — the one place that decides, so the two cannot drift.
 *
 * Returns null when there is nothing to draw: an unauthored core slot, or a
 * metric this activity does not have.
 */
export function resolveSlotStyle(
  design: TemplateStatDesign,
  slot: StatSlotId,
  data: StatData
): SlotStyle | null {
  if (!isMetricSlot(slot)) {
    return design.slots[slot as TextSlotId] ?? null;
  }

  const metric = metricForSlot(slot, data);
  if (!metric) return null;

  const base = donorStyle(design);
  if (!base) return null;

  return {
    ...base,
    fontSize: Math.min(base.fontSize, MAX_METRIC_FONT_SIZE),
    text: () => metric.value,
    // A metric's unit is part of the reading, so it always shows — even for
    // templates whose donor slot had no suffix.
    suffix: () => metric.unit,
    suffixScale: base.suffixScale ?? 0.45,
    suffixColor: base.suffixColor,
  };
}

/**
 * Fold a creator's per-slot tweaks onto the style the template produced.
 *
 * Kept here beside `resolveSlotStyle` because both the DOM renderer and the
 * canvas exporter call it — a style the two disagree on is an export that
 * doesn't match the preview.
 *
 * `suffixColor` follows `color` only when the design had not given the suffix
 * a colour of its own; a template that deliberately tints the unit differently
 * keeps that relationship.
 */
export function applySlotOverride(
  style: SlotStyle,
  override: StatSlotOverride | undefined
): SlotStyle {
  if (!override || (!override.fontFamily && !override.color)) return style;

  return {
    ...style,
    fontFamily: override.fontFamily ?? style.fontFamily,
    color: override.color ?? style.color,
    suffixColor:
      override.color && !style.suffixColor ? override.color : style.suffixColor,
  };
}

/** Metrics this activity carries, ordered for a picker. */
export function availableMetrics(data: StatData): MetricValue[] {
  const metrics = Object.values(data.metrics ?? {});
  const order: MetricValue["category"][] = [
    "Running",
    "Performance",
    "Elevation",
    "Ride",
    "Achievements",
  ];

  return metrics.slice().sort((a, b) => {
    const byCategory = order.indexOf(a.category) - order.indexOf(b.category);
    return byCategory !== 0 ? byCategory : a.label.localeCompare(b.label);
  });
}

/** Metrics grouped for a sectioned picker, empty categories dropped. */
export function metricsByCategory(
  data: StatData
): { category: MetricValue["category"]; metrics: MetricValue[] }[] {
  const groups = new Map<MetricValue["category"], MetricValue[]>();

  for (const metric of availableMetrics(data)) {
    const list = groups.get(metric.category) ?? [];
    list.push(metric);
    groups.set(metric.category, list);
  }

  return [...groups.entries()].map(([category, metrics]) => ({ category, metrics }));
}

/**
 * Drops metric slots the current activity cannot fill.
 *
 * A layout is remembered per template and reused across activities, so a
 * cycling layout carrying `metric:power` must not leave a blank chip on a
 * treadmill run.
 */
export function pruneUnavailableMetricSlots<T>(
  layout: Partial<Record<StatSlotId, T>>,
  data: StatData
): Partial<Record<StatSlotId, T>> {
  const pruned: Partial<Record<StatSlotId, T>> = {};

  for (const [slot, value] of Object.entries(layout) as [StatSlotId, T][]) {
    if (isMetricSlot(slot) && !metricForSlot(slot, data)) continue;
    pruned[slot] = value;
  }

  return pruned;
}
