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
  for (const lt of LENS_TEMPLATES_EXPANDED) {
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
  console.log(`✅ Seeded ${LENS_TEMPLATES_EXPANDED.length} lens templates`);
}

async function seedStickers(): Promise<void> {
  const now = new Date().toISOString();
  const stickers = [
    { id: "st_s1", content: "DISTANCE", label: "Distance", category: "Stats", type: "metric", bgGradient: "from-ember to-ember-lift text-ink", statKey: "distance" },
    { id: "st_s2", content: "PACE", label: "Pace", category: "Stats", type: "metric", bgGradient: "from-sky-500 to-blue-600", statKey: "pace" },
    { id: "st_s3", content: "TIME", label: "Time", category: "Stats", type: "metric", bgGradient: "from-rose-500 to-pink-600", statKey: "time" },
    { id: "st_s4", content: "TITLE", label: "Activity Title", category: "Stats", type: "metric", bgGradient: "from-amber-500 to-orange-600", statKey: "title" },
    { id: "st_2", content: "BEAST MODE 🔥", label: "Beast Mode", category: "Badges", type: "badge", bgGradient: "from-orange-600 to-red-500" },
    { id: "st_5", content: "RUNNER'S HIGH ⚡", label: "Runner's High", category: "Badges", type: "badge", bgGradient: "from-cyan-500 to-blue-600" },
    { id: "st_7", content: "FINISHER", label: "Finisher", category: "Badges", type: "badge", bgGradient: "from-yellow-400 to-amber-600" },
    { id: "st_l1", content: "CENTRAL PARK", label: "Central Park", category: "Locations", type: "location", bgGradient: "from-emerald-600 to-green-500" },
    { id: "st_l2", content: "SEA OCEAN TRAIL", label: "Sea Trail", category: "Locations", type: "location", bgGradient: "from-indigo-600 to-blue-500" },
    { id: "st_l4", content: "GOLDEN GATE", label: "Golden Gate", category: "Locations", type: "location", bgGradient: "from-rose-600 to-orange-500" },
  ];

  for (const s of stickers) {
    await stickerRepo.create(s.id, {
      content: s.content,
      label: s.label,
      category: s.category,
      type: s.type,
      bgGradient: s.bgGradient,
      statKey: s.statKey,
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
      lensTemplates: LENS_TEMPLATES_EXPANDED.length,
      stickers: 10, // hardcoded count from STICKER_LIBRARY
      stockPhotos: STOCK_PHOTOS.length,
      lensFilters: Object.keys(LENS_FILTER_MAP).length,
    },
  };

  console.log("✅ Seeding complete", result.counts);
  return result;
}
