/**
 * Seed script — uploads all existing hardcoded content to Firebase.
 *
 * This is triggered by a "Sync Mock Data to Firebase" button in the admin
 * dashboard. It converts the mock data arrays into Firestore documents
 * with the appropriate metadata (createdAt, updatedAt, isActive, createdBy).
 *
 * ── Safety ──
 * - Idempotent: calling it multiple times overwrites existing documents
 *   with the same ID but does not duplicate entries.
 * - Only runs when Firebase is available (env vars present).
 */

import {
  TEMPLATE_FAMILIES,
  LENS_TEMPLATES_EXPANDED,
  SAMPLE_STUDIO_TEMPLATES,
  STOCK_PHOTOS,
  LENS_FILTER_MAP,
} from "./mockData";
import { TEMPLATE_STAT_DESIGNS, getStatDesign } from "./templateStatDesigns";
import type {
  FirestoreTemplateFamily,
  FirestoreTemplateStatDesign,
  FirestoreLensTemplate,
  FirestoreSticker,
  FirestoreStockPhoto,
  FirestoreLensFilter,
  StorableSlotStyle,
  StorableTemplateStatDesign,
} from "../types/content";
import type { SlotStyle, TemplateStatDesign, TextSlotId, StatData } from "../types";
import { ContentRepository } from "../services/contentRepository";
import { isFirebaseAvailable } from "../services/firebase";
import { invalidateAllCaches } from "../services/contentService";

// ====================================================================
// Repositories
// ====================================================================

const templateFamilyRepo = new ContentRepository<FirestoreTemplateFamily>("templateFamilies");
const statDesignRepo = new ContentRepository<FirestoreTemplateStatDesign>("templateStatDesigns");
const lensTemplateRepo = new ContentRepository<FirestoreLensTemplate>("lensTemplates");
const stickerRepo = new ContentRepository<FirestoreSticker>("stickers");
const stockPhotoRepo = new ContentRepository<FirestoreStockPhoto>("stockPhotos");
const lensFilterRepo = new ContentRepository<FirestoreLensFilter>("lensFilters");

// ====================================================================
// Formatter name → function (reverse of formatterRegistry)
// ====================================================================

/** Crude reverse-mapping of formatter functions to their registry names. */
function guessFormatterName(fn: ((d: StatData) => string) | undefined): string {
  if (!fn) return "noop";
  const sample: StatData = { distance: 5.24, distanceUnit: "km", pace: "5:12", time: "26:04", title: "Morning Run" };
  const result = fn(sample);
  // Try to match by result value
  const candidates: Record<string, string> = {
    "5.2": "dist1",
    "5.24": "dist2",
    "05.24": "distPadded",
    "km": "unit",
    "KM": "unitUpper",
    "5:12": "pace",
    "26:04": "time",
    "Morning Run": "title",
  };
  return candidates[result] ?? "title";
}

/** Convert a runtime SlotStyle to a StorableSlotStyle (best-effort). */
function storableSlotStyle(style: SlotStyle): StorableSlotStyle {
  return {
    textFormatter: guessFormatterName(style.text),
    suffixFormatter: style.suffix ? guessFormatterName(style.suffix) : undefined,
    suffixScale: style.suffixScale,
    suffixColor: style.suffixColor,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: style.color,
    italic: style.italic,
    uppercase: style.uppercase,
    letterSpacing: style.letterSpacing,
    rotation: style.rotation,
    bg: style.bg,
    shadow: style.shadow,
  };
}

/** Convert a runtime TemplateStatDesign to a StorableTemplateStatDesign. */
function storableStatDesign(
  templateId: string,
  design: TemplateStatDesign
): StorableTemplateStatDesign {
  const slots: Partial<Record<TextSlotId, StorableSlotStyle>> = {};
  const textSlots: TextSlotId[] = ["distance", "pace", "time", "title"];
  for (const slotId of textSlots) {
    const s = design.slots[slotId];
    if (s) slots[slotId] = storableSlotStyle(s);
  }

  return {
    templateFamilyId: templateId,
    slots,
    defaultLayout: design.defaultLayout,
    accentType: design.accentRender ? "custom" : "none",
  };
}

// ====================================================================
// Seed functions
// ====================================================================

async function seedTemplateFamilies(): Promise<void> {
  const now = new Date().toISOString();
  for (const tf of TEMPLATE_FAMILIES) {
    await templateFamilyRepo.create(tf.id, {
      name: tf.name,
      category: tf.category,
      icon: tf.icon,
      tagline: tf.tagline,
      accentColor: tf.accentColor,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      createdBy: "seed",
    });
  }
  console.log(`✅ Seeded ${TEMPLATE_FAMILIES.length} template families`);
}

async function seedStatDesigns(): Promise<void> {
  const now = new Date().toISOString();
  let count = 0;
  for (const templateId of Object.keys(TEMPLATE_STAT_DESIGNS)) {
    const design = getStatDesign(templateId);
    if (!design) continue;
    const stored = storableStatDesign(templateId, design);
    await statDesignRepo.create(`design_${templateId}`, {
      ...stored,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      createdBy: "seed",
    });
    count++;
  }
  console.log(`✅ Seeded ${count} stat designs`);
}

async function seedLensTemplates(): Promise<void> {
  const now = new Date().toISOString();
  const allTemplates = [...LENS_TEMPLATES_EXPANDED, ...SAMPLE_STUDIO_TEMPLATES];
  for (const lt of allTemplates) {
    // defaultElements is already serializable — store directly
    await lensTemplateRepo.create(lt.id, {
      name: lt.name,
      category: lt.category,
      icon: lt.icon,
      tagline: lt.tagline,
      badgeColor: lt.badgeColor,
      overlayType: lt.overlayType,
      defaultElements: lt.defaultElements,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      createdBy: "seed",
    });
  }
  console.log(`✅ Seeded ${allTemplates.length} lens templates`);
}

async function seedStickers(): Promise<void> {
  const now = new Date().toISOString();
  const stickers: Array<{
    id: string; content: string; label: string; category: string;
    type: string; bgGradient?: string; statKey?: string; format?: string; transparent?: boolean;
  }> = [
    // Transparent stat overlays
    { id: "st_dist", content: "{value} {unit}", label: "Distance", category: "Distance", type: "metric", statKey: "distance", format: "{value} {unit}", transparent: true },
    { id: "st_pace", content: "{value} /km", label: "Pace", category: "Pace", type: "metric", statKey: "pace", format: "{value} /km", transparent: true },
    { id: "st_time", content: "{value}", label: "Duration", category: "Time", type: "metric", statKey: "time", transparent: true },
    { id: "st_title", content: "{value}", label: "Activity Title", category: "Activity", type: "metric", statKey: "title", transparent: true },
    { id: "st_avg_hr", content: "{value} {unit}", label: "Avg Heart Rate", category: "Heart Rate", type: "metric", statKey: "avg_hr", format: "{value} {unit}", transparent: true },
    { id: "st_max_hr", content: "{value} {unit}", label: "Max Heart Rate", category: "Heart Rate", type: "metric", statKey: "max_hr", format: "{value} {unit}", transparent: true },
    { id: "st_elev", content: "+{value}{unit}", label: "Elevation Gain", category: "Elevation", type: "metric", statKey: "elev_gain", format: "+{value}{unit}", transparent: true },
    { id: "st_elev_loss", content: "{value}{unit}", label: "Elevation Loss", category: "Elevation", type: "metric", statKey: "elev_loss", format: "{value}{unit}", transparent: true },
    { id: "st_speed", content: "{value} km/h", label: "Speed", category: "Speed", type: "metric", statKey: "speed", format: "{value} km/h", transparent: true },
    { id: "st_max_speed", content: "{value} km/h", label: "Max Speed", category: "Speed", type: "metric", statKey: "max_speed", format: "{value} km/h", transparent: true },
    { id: "st_cadence", content: "{value} {unit}", label: "Cadence", category: "Cadence", type: "metric", statKey: "cadence", format: "{value} {unit}", transparent: true },
    { id: "st_calories", content: "{value} {unit}", label: "Calories", category: "Energy", type: "metric", statKey: "calories", format: "{value} {unit}", transparent: true },
    { id: "st_power", content: "{value} {unit}", label: "Power", category: "Power", type: "metric", statKey: "power", format: "{value} {unit}", transparent: true },
    { id: "st_avg_power", content: "{value} {unit}", label: "Avg Power", category: "Power", type: "metric", statKey: "avg_power", format: "{value} {unit}", transparent: true },
    { id: "st_temp", content: "{value}{unit}", label: "Temperature", category: "Weather", type: "metric", statKey: "temp", format: "{value}{unit}", transparent: true },
    // Metric pills (colored bg)
    { id: "st_p_hr", content: "{value} {unit}", label: "Heart Rate", category: "Heart Rate", type: "metric", statKey: "avg_hr", format: "{value} {unit}", bgGradient: "from-rose-500 to-pink-600" },
    { id: "st_p_elev", content: "+{value}{unit}", label: "Elevation", category: "Elevation", type: "metric", statKey: "elev_gain", format: "+{value}{unit}", bgGradient: "from-emerald-600 to-green-500" },
    { id: "st_p_cal", content: "{value} {unit}", label: "Calories", category: "Energy", type: "metric", statKey: "calories", format: "{value} {unit}", bgGradient: "from-orange-500 to-red-500" },
    { id: "st_p_speed", content: "{value} km/h", label: "Speed", category: "Speed", type: "metric", statKey: "speed", format: "{value} km/h", bgGradient: "from-cyan-500 to-blue-600" },
    { id: "st_p_cad", content: "{value} {unit}", label: "Cadence", category: "Cadence", type: "metric", statKey: "cadence", format: "{value} {unit}", bgGradient: "from-violet-500 to-purple-600" },
    { id: "st_p_pwr", content: "{value} {unit}", label: "Power", category: "Power", type: "metric", statKey: "power", format: "{value} {unit}", bgGradient: "from-yellow-400 to-amber-600" },
    { id: "st_p_temp", content: "{value}{unit}", label: "Temperature", category: "Weather", type: "metric", statKey: "temp", format: "{value}{unit}", bgGradient: "from-sky-400 to-indigo-500" },
    { id: "st_p_dist", content: "{value} {unit}", label: "Distance", category: "Distance", type: "metric", statKey: "distance", format: "{value} {unit}", bgGradient: "from-blue-500 to-indigo-600" },
    { id: "st_p_pace", content: "{value}", label: "Pace", category: "Pace", type: "metric", statKey: "pace", bgGradient: "from-teal-500 to-cyan-600" },
  ];

  for (const s of stickers) {
    await stickerRepo.create(s.id, {
      content: s.content,
      label: s.label,
      category: s.category,
      type: s.type,
      bgGradient: s.bgGradient,
      statKey: s.statKey,
      format: s.format,
      transparent: s.transparent,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      createdBy: "seed",
    });
  }
  console.log(`✅ Seeded ${stickers.length} stickers`);
}

async function seedStockPhotos(): Promise<void> {
  const now = new Date().toISOString();
  for (const sp of STOCK_PHOTOS) {
    await stockPhotoRepo.create(sp.id, {
      name: sp.name,
      category: sp.category,
      storagePath: sp.url,
      thumbnailStoragePath: sp.thumbnailUrl,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      createdBy: "seed",
    });
  }
  console.log(`✅ Seeded ${STOCK_PHOTOS.length} stock photos`);
}

async function seedLensFilters(): Promise<void> {
  const now = new Date().toISOString();
  for (const [overlayType, filterCSS] of Object.entries(LENS_FILTER_MAP)) {
    await lensFilterRepo.create(overlayType, {
      name: overlayType,
      overlayType,
      filterCSS,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      createdBy: "seed",
    });
  }
  console.log(`✅ Seeded ${Object.keys(LENS_FILTER_MAP).length} lens filters`);
}

// ====================================================================
// Main entry point
// ====================================================================

export interface SeedResult {
  success: boolean;
  counts: Record<string, number>;
  error?: string;
}

/**
 * Upload all mock data to Firebase Firestore.
 * Safe to call multiple times — idempotent per document ID.
 *
 * Returns a summary object with counts per collection.
 * Throws if Firebase is unavailable.
 */
export async function seedAllContentToFirebase(): Promise<SeedResult> {
  if (!isFirebaseAvailable()) {
    throw new Error(
      "Firebase is not configured. Set VITE_FIREBASE_* env vars in .env"
    );
  }

  console.log("🌱 Seeding content to Firebase…");

  await Promise.all([
    seedTemplateFamilies(),
    seedStatDesigns(),
    seedLensTemplates(),
    seedStickers(),
    seedStockPhotos(),
    seedLensFilters(),
  ]);

  // Invalidate all caches so the content service re-fetches from Firestore
  invalidateAllCaches();

  const result: SeedResult = {
    success: true,
    counts: {
      templateFamilies: TEMPLATE_FAMILIES.length,
      statDesigns: Object.keys(TEMPLATE_STAT_DESIGNS).length,
      lensTemplates: LENS_TEMPLATES_EXPANDED.length + SAMPLE_STUDIO_TEMPLATES.length,
      stickers: 24, // hardcoded count from seedStickers
      stockPhotos: STOCK_PHOTOS.length,
      lensFilters: Object.keys(LENS_FILTER_MAP).length,
    },
  };

  console.log("✅ Seeding complete", result.counts);
  return result;
}
