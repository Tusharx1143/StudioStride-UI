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
// Document IDs
// ====================================================================

/**
 * Turn a user-supplied name into a Firestore-safe document id.
 *
 * The old inline version only collapsed whitespace, so "Trail / Road" kept its
 * slash — an illegal character in a document id — and accents survived into
 * ids that no longer round-tripped. Everything outside [a-z0-9] becomes an
 * underscore.
 */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "item";
}

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
  const created = await templateFamilyRepo.createUnique(slugify(data.name), doc);
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

/**
 * Raw design documents, keyed by template family.
 *
 * `getStatDesigns` resolves formatter names into functions, which is what the
 * renderers want but throws away the very fields an editor has to load back —
 * the admin could only ever create a design from scratch, so re-saving an
 * existing one silently wiped it.
 */
export async function getStatDesignDocs(): Promise<
  Record<string, StorableTemplateStatDesign>
> {
  const cached = cache.get<Record<string, StorableTemplateStatDesign>>(
    "template_stat_design_raw"
  );
  if (cached) return cached;

  const raw = await statDesignRepo.getActive();
  const result: Record<string, StorableTemplateStatDesign> = {};
  for (const doc of raw) {
    result[doc.templateFamilyId] = {
      templateFamilyId: doc.templateFamilyId,
      slots: doc.slots ?? {},
      defaultLayout: doc.defaultLayout ?? {},
      accentType: doc.accentType ?? "none",
    };
  }
  cache.set("template_stat_design_raw", result);
  return result;
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
  const created = await lensTemplateRepo.createUnique(slugify(data.name), doc);
  cache.invalidate("lens_template");
  return { ...data, id: created.id, overlayType: data.overlayType as import("../types").LensTemplate["overlayType"] };
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
  const created = await stickerRepo.createUnique(slugify(data.label), doc);
  cache.invalidate("sticker");
  return { ...data, id: created.id, type: data.type as StickerItem["type"] };
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
  data: StockPhotoFormData
): Promise<import("../types").PhotoSource> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreStockPhoto, "id"> = {
    name: data.name,
    category: data.category,
    // `storagePath` predates the decision to host stock photos externally; it
    // holds the image URL verbatim, exactly as the seeded documents do.
    storagePath: data.url,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    createdBy: "admin",
  };
  const created = await stockPhotoRepo.createUnique(slugify(data.name), doc);
  cache.invalidate("stock_photo");
  return {
    id: created.id,
    name: data.name,
    category: data.category as import("../types").PhotoSource["category"],
    url: data.url,
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

/**
 * Every font document, retired ones included.
 *
 * The app needs the inactive records too: a bundled typeface is only really
 * gone once something says so, and `getActive()` can't distinguish "never
 * seeded" from "deliberately unpublished". See `mergeFonts`.
 */
export async function getAllFonts(): Promise<FirestoreFont[]> {
  const cached = cache.get<FirestoreFont[]>("font_all");
  if (cached) return cached;
  const data = await fontRepo.getAll();
  cache.set("font_all", data);
  return data;
}

export async function createFont(data: FontFormData): Promise<void> {
  const now = new Date().toISOString();
  const doc: Omit<FirestoreFont, "id"> = { ...data, createdAt: now, updatedAt: now, isActive: true, createdBy: "admin" };
  await fontRepo.createUnique(slugify(data.name), doc);
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
  await colorPaletteRepo.createUnique(slugify(data.name), doc);
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
// Admin: publish state across every content type
// ====================================================================

/**
 * Every content repository, keyed by the group names the Published screen uses.
 *
 * The typed getters above all filter to `isActive === true`, which is right for
 * the app but leaves the admin unable to see — let alone restore — anything it
 * has unpublished. These three functions are the admin's view over the same
 * collections, inactive documents included.
 */
const GROUP_REPOS = {
  lenses: lensTemplateRepo,
  templates: templateFamilyRepo,
  stickers: stickerRepo,
  fonts: fontRepo,
  colors: colorPaletteRepo,
  photos: stockPhotoRepo,
  filters: lensFilterRepo,
  statDesigns: statDesignRepo,
} as const;

export type ContentGroup = keyof typeof GROUP_REPOS;

/** A content document as the Published screen needs it — identity plus state. */
export interface AdminContentItem {
  id: string;
  /** Best available human label; falls back to the id. */
  label: string;
  isActive: boolean;
}

function labelOf(doc: Record<string, unknown>): string {
  for (const key of ["name", "label", "title", "overlayType"]) {
    const v = doc[key];
    if (typeof v === "string" && v) return v;
  }
  return String(doc.id ?? "");
}

/** Every document in a group, published or not. */
export async function getGroupItems(
  group: ContentGroup
): Promise<AdminContentItem[]> {
  const raw = (await GROUP_REPOS[group].getAll()) as unknown as Record<
    string,
    unknown
  >[];
  return raw
    .map((doc) => ({
      id: String(doc.id),
      label: labelOf(doc),
      // Documents seeded before isActive existed should read as published
      // rather than silently vanishing from the admin's list.
      isActive: doc.isActive !== false,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Publish or unpublish a document without deleting it. */
export async function setGroupItemActive(
  group: ContentGroup,
  id: string,
  isActive: boolean
): Promise<void> {
  await GROUP_REPOS[group].update(id, {
    isActive,
    updatedAt: new Date().toISOString(),
  } as never);
  // Cheaper to re-read one collection than to keep eight cache keys in sync.
  cache.invalidate();
}

/** Permanently remove a document. Unpublishing is `setGroupItemActive`. */
export async function deleteGroupItem(
  group: ContentGroup,
  id: string
): Promise<void> {
  await GROUP_REPOS[group].delete(id);
  cache.invalidate();
}

// ====================================================================
// Bulk invalidation (after seed / batch operations)
// ====================================================================

export function invalidateAllCaches(): void {
  cache.invalidate();
}
