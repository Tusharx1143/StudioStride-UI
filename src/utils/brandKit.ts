import type { StatSlotId, TemplateLayout } from "../types";

/**
 * The brand kit: the look a creator reuses.
 *
 * Serious creators post several times a week and want a consistent look, but
 * every session started from scratch — pick template, recolour, reposition,
 * re-add stickers. `LensTemplate.isFavorite` was declared and never used, and
 * the nine hardcoded swatches were a ceiling rather than a starting point.
 *
 * Pure, with storage isolated to the two functions at the bottom, so the
 * shapes and the merge logic stay testable.
 */

export interface StylePreset {
  id: string;
  name: string;
  /** ISO 8601. */
  createdAt: string;
  templateId: string;
  statLayout: TemplateLayout;
  hiddenSlots: StatSlotId[];
  lensFilter: string;
  filterIntensity: number;
  /** Default colour for new text, taken from the canvas when saved. */
  textColor: string;
}

export interface BrandKit {
  presets: StylePreset[];
  /** Template ids the user has starred. */
  favouriteTemplates: string[];
  /** Template ids, most recent first. */
  recentTemplates: string[];
  /** Hex colours the user has added beyond the built-in palette. */
  customColors: string[];
}

export const EMPTY_KIT: BrandKit = {
  presets: [],
  favouriteTemplates: [],
  recentTemplates: [],
  customColors: [],
};

/** Keeps the strip short enough to stay scannable. */
export const MAX_RECENT_TEMPLATES = 6;
export const MAX_CUSTOM_COLORS = 12;
export const MAX_PRESETS = 20;

const STORAGE_KEY = "stride_brand_kit_v1";

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((v): v is string => typeof v === "string"))];
}

export function newPresetId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Most recent first, capped. Re-selecting an existing template promotes it. */
export function pushRecentTemplate(kit: BrandKit, templateId: string): BrandKit {
  const recentTemplates = [
    templateId,
    ...kit.recentTemplates.filter((id) => id !== templateId),
  ].slice(0, MAX_RECENT_TEMPLATES);

  return { ...kit, recentTemplates };
}

export function toggleFavouriteTemplate(kit: BrandKit, templateId: string): BrandKit {
  const isFavourite = kit.favouriteTemplates.includes(templateId);

  return {
    ...kit,
    favouriteTemplates: isFavourite
      ? kit.favouriteTemplates.filter((id) => id !== templateId)
      : [...kit.favouriteTemplates, templateId],
  };
}

export function isFavouriteTemplate(kit: BrandKit, templateId: string): boolean {
  return kit.favouriteTemplates.includes(templateId);
}

/** Adds a swatch. Case-insensitive, so #FF7A1A and #ff7a1a are one colour. */
export function addCustomColor(kit: BrandKit, hex: string): BrandKit {
  if (!isHexColor(hex)) return kit;

  const normalised = hex.toUpperCase();
  const existing = kit.customColors.filter((c) => c.toUpperCase() !== normalised);

  return { ...kit, customColors: [normalised, ...existing].slice(0, MAX_CUSTOM_COLORS) };
}

export function removeCustomColor(kit: BrandKit, hex: string): BrandKit {
  return {
    ...kit,
    customColors: kit.customColors.filter((c) => c.toUpperCase() !== hex.toUpperCase()),
  };
}

/** Newest first, capped — the oldest preset falls off rather than failing. */
export function addPreset(kit: BrandKit, preset: StylePreset): BrandKit {
  return { ...kit, presets: [preset, ...kit.presets].slice(0, MAX_PRESETS) };
}

export function removePreset(kit: BrandKit, presetId: string): BrandKit {
  return { ...kit, presets: kit.presets.filter((p) => p.id !== presetId) };
}

/** Fills anything missing, so an older or hand-edited record cannot crash. */
export function normalizeKit(raw: unknown): BrandKit {
  if (typeof raw !== "object" || raw === null) return EMPTY_KIT;

  const record = raw as Record<string, unknown>;
  const presets = Array.isArray(record.presets)
    ? (record.presets.filter(
        (p) => typeof p === "object" && p !== null && typeof (p as StylePreset).id === "string"
      ) as StylePreset[])
    : [];

  return {
    presets: presets.slice(0, MAX_PRESETS),
    favouriteTemplates: uniqueStrings(record.favouriteTemplates),
    recentTemplates: uniqueStrings(record.recentTemplates).slice(0, MAX_RECENT_TEMPLATES),
    customColors: uniqueStrings(record.customColors)
      .filter(isHexColor)
      .map((c) => c.toUpperCase())
      .slice(0, MAX_CUSTOM_COLORS),
  };
}

export function loadBrandKit(): BrandKit {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeKit(JSON.parse(raw)) : EMPTY_KIT;
  } catch {
    return EMPTY_KIT;
  }
}

export function saveBrandKit(kit: BrandKit): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kit));
  } catch {
    // Storage unavailable or full; the kit stays in memory for this session.
  }
}
