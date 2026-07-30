/**
 * Type-specialized content CRUD service.
 *
 * Provides per-content-type functions (getTemplateFamilies, getLensTemplates, etc.)
 * that wrap the generic `ContentRepository` with appropriate type parameters
 * and run-time transformations (string formatters → functions, accent types →
 * renderers).
 *
 * ── Caching ──
 * A simple in-memory cache (ContentCache, 5-min TTL) avoids redundant reads.
 * The cache is invalidated when the admin creates/updates/deletes content.
 * Consumers call `invalidateCache()` after mutations.
 *
 * ── Stat design resolution ──
 * `resolveStatDesign()` converts a `StorableTemplateStatDesign` (Firestore-safe)
 * to a `TemplateStatDesign` (runtime-ready with function fields) by looking up
 * formatter names in `FORMATTER_REGISTRY` and accent types in `ACCENT_REGISTRY`.
 */

import type { TemplateFamily, TemplateStatDesign } from "../types";
import type {
  ContentType,
  FirestoreLensFilter,
  FirestoreLensTemplate,
  FirestoreStockPhoto,
  FirestoreSticker,
  FirestoreTemplateFamily,
  FirestoreTemplateStatDesign,
  FirestoreFont,
  FirestoreColorPalette,
  LensTemplateFormData,
  LensFilterFormData,
  StickerFormData,
  StockPhotoFormData,
  TemplateFamilyFormData,
  StorableTemplateStatDesign,
  StickerItem,
  FontFormData,
  ColorPaletteFormData,
} from "../types/content";
import { ContentRepository } from "./contentRepository";
import { resolveFormatter } from "../data/formatterRegistry";
import { ACCENT_REGISTRY } from "../data/accentRegistry";

// ====================================================================
// Caching
// ====================================================================

class ContentCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(type?: ContentType): void {
    if (type) {
      this.cache.delete(type);
    } else {
      this.cache.clear();
    }
  }
}

const cache = new ContentCache();

// ====================================================================
// Repositories
// ====================================================================

const templateFamilyRepo = new ContentRepository<FirestoreTemplateFamily>(
  "templateFamilies"
);
const statDesignRepo = new ContentRepository<FirestoreTemplateStatDesign>(
  "templateStatDesigns"
);
const lensTemplateRepo = new ContentRepository<FirestoreLensTemplate>(
  "lensTemplates"
);
const stickerRepo = new ContentRepository<FirestoreSticker>("stickers");
const stockPhotoRepo = new ContentRepository<FirestoreStockPhoto>("stockPhotos");
const lensFilterRepo = new ContentRepository<FirestoreLensFilter>(
  "lensFilters"
);
const fontRepo = new ContentRepository<FirestoreFont>("fonts");
const colorPaletteRepo = new ContentRepository<FirestoreColorPalette>("colorPalettes");

// ====================================================================
// Stat design resolution helpers
// ====================================================================

/** Convert a Firestore-safe slot style to a runtime SlotStyle. */
function resolveSlotStyle(
  s: import("../types/content").StorableSlotStyle
): import("../types").SlotStyle {
  return {
    text: resolveFormatter(s.textFormatter),
    suffix: s.suffixFormatter ? resolveFormatter(s.suffixFormatter) : undefined,
    suffixScale: s.suffixScale,
    suffixColor: s.suffixColor,
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    color: s.color,
    italic: s.italic,
    uppercase: s.uppercase,
    letterSpacing: s.letterSpacing,
    rotation: s.rotation,
    bg: s.bg,
    shadow: s.shadow,
  };
}

/** Convert a Firestore-safe stat design to a runtime TemplateStatDesign. */
export function resolveStatDesign(
  stored: StorableTemplateStatDesign
): TemplateStatDesign {
  const slots: TemplateStatDesign["slots"] = {};
  for (const [slotId, slotStyle] of Object.entries(stored.slots)) {
    if (slotStyle) {
      slots[slotId as import("../types").TextSlotId] =
        resolveSlotStyle(slotStyle);
    }
  }

  let accentRender: TemplateStatDesign["accentRender"];
  let accentDraw: TemplateStatDesign["accentDraw"];
  if (stored.accentType && stored.accentType !== "none") {
    const entry = ACCENT_REGISTRY[stored.accentType];
    if (entry) {
      accentRender = entry.render;
      accentDraw = entry.draw;
    }
  }

  return {
    slots,
    defaultLayout: stored.defaultLayout,
    accentRender,
    accentDraw,
  };
}

// ====================================================================
// Template Families
// ====================================================================

export async function getTemplateFamilies(): Promise<TemplateFamily[]> {
  const cached = cache.get<TemplateFamily[]>("template_family");
  if (cached) return cached;

  const raw = await templateFamilyRepo.getActive();
  const result = raw.map(({ id, name, category, icon, tagline, accentColor }) => ({
    id,
    name,
    category,
    icon,
    tagline,
    accentColor,
  }));
  cache.set("template_family", result);
  return result;
}

export async function getTemplateFamily(
  id: string
): Promise<TemplateFamily | null> {
  const raw = await templateFamilyRepo.getById(id);
  if (!raw) return null;
  const { name, category, icon, tagline, accentColor } = raw;
  return { id, name, category, icon, tagline, accentColor };
}

export async function createTemplateFamily(
  data: TemplateFamilyFormData
): Promise<TemplateFamily> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreTemplateFamily, "id"> = {
    ...data,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    createdBy: "admin",
  };
  const id = data.name.toLowerCase().replace(/\s+/g, "_");
  const created = await templateFamilyRepo.create(id, doc);
  cache.invalidate("template_family");
  return { ...data, id: created.id };
}

export async function updateTemplateFamily(
  id: string,
  data: Partial<TemplateFamilyFormData>
): Promise<void> {
  await templateFamilyRepo.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  cache.invalidate("template_family");
}

export async function deleteTemplateFamily(id: string): Promise<void> {
  await templateFamilyRepo.softDelete(id);
  cache.invalidate("template_family");
}

// ====================================================================
// Template Stat Designs
// ====================================================================

export async function getStatDesigns(): Promise<
  Record<string, TemplateStatDesign>
> {
  const cached = cache.get<Record<string, TemplateStatDesign>>(
    "template_stat_design"
  );
  if (cached) return cached;

  const raw = await statDesignRepo.getActive();
  const result: Record<string, TemplateStatDesign> = {};
  for (const doc of raw) {
    const { templateFamilyId, slots, defaultLayout, accentType } = doc;
    result[templateFamilyId] = resolveStatDesign({
      templateFamilyId,
      slots,
      defaultLayout,
      accentType: accentType ?? "none",
    });
  }
  cache.set("template_stat_design", result);
  return result;
}

export async function getStatDesign(
  templateFamilyId: string
): Promise<TemplateStatDesign | null> {
  const all = await getStatDesigns();
  return all[templateFamilyId] ?? null;
}

export async function createStatDesign(
  data: import("../types/content").StatDesignFormData
): Promise<void> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreTemplateStatDesign, "id"> = {
    ...data,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    createdBy: "admin",
  };
  await statDesignRepo.create(`design_${data.templateFamilyId}`, doc);
  cache.invalidate("template_stat_design");
}

export async function updateStatDesign(
  templateFamilyId: string,
  data: Partial<import("../types/content").StatDesignFormData>
): Promise<void> {
  await statDesignRepo.update(`design_${templateFamilyId}`, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  cache.invalidate("template_stat_design");
}

// ====================================================================
// Lens Templates
// ====================================================================

export async function getLensTemplates(): Promise<
  import("../types").LensTemplate[]
> {
  const cached = cache.get<import("../types").LensTemplate[]>("lens_template");
  if (cached) return cached;

  const raw = await lensTemplateRepo.getActive();
  const result = raw.map((doc) => ({
    id: doc.id,
    name: doc.name,
    category: doc.category,
    icon: doc.icon,
    tagline: doc.tagline,
    badgeColor: doc.badgeColor,
    overlayType: doc.overlayType as import("../types").LensTemplate["overlayType"],
    defaultElements: doc.defaultElements,
  }));
  cache.set("lens_template", result);
  return result;
}

export async function createLensTemplate(
  data: LensTemplateFormData
): Promise<import("../types").LensTemplate> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreLensTemplate, "id"> = {
    ...data,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    createdBy: "admin",
  };
  const id = data.name.toLowerCase().replace(/\s+/g, "_");
  await lensTemplateRepo.create(id, doc);
  cache.invalidate("lens_template");
  return { ...data, id, overlayType: data.overlayType as import("../types").LensTemplate["overlayType"] };
}

export async function updateLensTemplate(
  id: string,
  data: Partial<LensTemplateFormData>
): Promise<void> {
  await lensTemplateRepo.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  cache.invalidate("lens_template");
}

export async function deleteLensTemplate(id: string): Promise<void> {
  await lensTemplateRepo.softDelete(id);
  cache.invalidate("lens_template");
}

// ====================================================================
// Stickers
// ====================================================================

export async function getStickers(): Promise<StickerItem[]> {
  const cached = cache.get<StickerItem[]>("sticker");
  if (cached) return cached;

  const raw = await stickerRepo.getActive();
  const result = raw.map((doc) => ({
    id: doc.id,
    content: doc.content,
    label: doc.label,
    category: doc.category,
    type: doc.type as StickerItem["type"],
    bgGradient: doc.bgGradient,
    statKey: doc.statKey,
    format: doc.format,
    transparent: doc.transparent,
  }));
  cache.set("sticker", result);
  return result;
}

export async function createSticker(
  data: StickerFormData
): Promise<StickerItem> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreSticker, "id"> = {
    ...data,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    createdBy: "admin",
  };
  const id = data.label.toLowerCase().replace(/\s+/g, "_");
  await stickerRepo.create(id, doc);
  cache.invalidate("sticker");
  return { ...data, id, type: data.type as StickerItem["type"] };
}

export async function updateSticker(
  id: string,
  data: Partial<StickerFormData>
): Promise<void> {
  await stickerRepo.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  cache.invalidate("sticker");
}

export async function deleteSticker(id: string): Promise<void> {
  await stickerRepo.softDelete(id);
  cache.invalidate("sticker");
}

// ====================================================================
// Stock Photos
// ====================================================================

export async function getStockPhotos(): Promise<
  import("../types").PhotoSource[]
> {
  const cached = cache.get<import("../types").PhotoSource[]>("stock_photo");
  if (cached) return cached;

  const raw = await stockPhotoRepo.getActive();
  const result: import("../types").PhotoSource[] = raw.map((doc) => ({
    id: doc.id,
    name: doc.name,
    category: doc.category as import("../types").PhotoSource["category"],
    url: doc.storagePath, // resolved at render time
    thumbnailUrl: doc.thumbnailStoragePath,
  }));
  cache.set("stock_photo", result);
  return result;
}

export async function createStockPhoto(
  data: StockPhotoFormData & { storagePath: string }
): Promise<import("../types").PhotoSource> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreStockPhoto, "id"> = {
    name: data.name,
    category: data.category,
    storagePath: data.storagePath,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    createdBy: "admin",
  };
  const id = data.name.toLowerCase().replace(/\s+/g, "_");
  await stockPhotoRepo.create(id, doc);
  cache.invalidate("stock_photo");
  return {
    id,
    name: data.name,
    category: data.category as import("../types").PhotoSource["category"],
    url: data.storagePath,
  };
}

export async function deleteStockPhoto(id: string): Promise<void> {
  await stockPhotoRepo.softDelete(id);
  cache.invalidate("stock_photo");
}

// ====================================================================
// Lens Filters
// ====================================================================

export async function getLensFilters(): Promise<Record<string, string>> {
  const cached = cache.get<Record<string, string>>("lens_filter");
  if (cached) return cached;

  const raw = await lensFilterRepo.getActive();
  const result: Record<string, string> = {};
  for (const doc of raw) {
    result[doc.overlayType] = doc.filterCSS;
  }
  cache.set("lens_filter", result);
  return result;
}

export async function createLensFilter(
  data: LensFilterFormData
): Promise<void> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreLensFilter, "id"> = {
    ...data,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    createdBy: "admin",
  };
  await lensFilterRepo.create(data.overlayType, doc);
  cache.invalidate("lens_filter");
}

export async function updateLensFilter(
  id: string,
  data: Partial<LensFilterFormData>
): Promise<void> {
  await lensFilterRepo.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  cache.invalidate("lens_filter");
}

export async function deleteLensFilter(id: string): Promise<void> {
  await lensFilterRepo.softDelete(id);
  cache.invalidate("lens_filter");
}

// ====================================================================
// Fonts
// ====================================================================

export async function getFonts(): Promise<FirestoreFont[]> {
  const cached = cache.get<FirestoreFont[]>("font");
  if (cached) return cached;
  const data = await fontRepo.getActive();
  cache.set("font", data);
  return data;
}

export async function createFont(data: FontFormData): Promise<void> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreFont, "id"> = { ...data, createdAt: now, updatedAt: now, isActive: true, createdBy: "admin" };
  const id = data.name.toLowerCase().replace(/\s+/g, "_");
  await fontRepo.create(id, doc);
  cache.invalidate("font");
}

export async function updateFont(id: string, data: Partial<FontFormData>): Promise<void> {
  await fontRepo.update(id, { ...data, updatedAt: new Date().toISOString() });
  cache.invalidate("font");
}

export async function deleteFont(id: string): Promise<void> {
  await fontRepo.softDelete(id);
  cache.invalidate("font");
}

// ====================================================================
// Color Palettes
// ====================================================================

export async function getColorPalettes(): Promise<FirestoreColorPalette[]> {
  const cached = cache.get<FirestoreColorPalette[]>("colorPalette");
  if (cached) return cached;
  const data = await colorPaletteRepo.getActive();
  cache.set("colorPalette", data);
  return data;
}

export async function createColorPalette(data: ColorPaletteFormData): Promise<void> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreColorPalette, "id"> = { ...data, createdAt: now, updatedAt: now, isActive: true, createdBy: "admin" };
  const id = data.name.toLowerCase().replace(/\s+/g, "_");
  await colorPaletteRepo.create(id, doc);
  cache.invalidate("colorPalette");
}

export async function updateColorPalette(id: string, data: Partial<ColorPaletteFormData>): Promise<void> {
  await colorPaletteRepo.update(id, { ...data, updatedAt: new Date().toISOString() });
  cache.invalidate("colorPalette");
}

export async function deleteColorPalette(id: string): Promise<void> {
  await colorPaletteRepo.softDelete(id);
  cache.invalidate("colorPalette");
}

// ====================================================================
// Bulk invalidation (after seed / batch operations)
// ====================================================================

export function invalidateAllCaches(): void {
  cache.invalidate();
}
