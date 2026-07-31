/**
 * Content delivery context.
 *
 * Provides all template/sticker/preset content to the rest of the app
 * (editor, camera, template carousels).  Follows the same pattern as
 * ActivitySourcesContext.
 *
 * ── Resolution tiers ──
 * 1. Firebase (when VITE_USE_FIREBASE_CONTENT=true and content exists)
 * 2. Hardcoded mock data (fallback — always works, never deleted)
 *
 * The fallback chain is invisible to consumers: they just call `useContent()`
 * and receive the content bundle regardless of source.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { TemplateFamily, TemplateStatDesign, LensTemplate, PhotoSource } from "../types";
import type {
  StickerItem,
  ContentBundle,
  FirestoreFont,
  FirestoreColorPalette,
} from "../types/content";
import {
  getTemplateFamilies,
  getStatDesigns,
  getLensTemplates,
  getStickers,
  getStockPhotos,
  getLensFilters,
  getFonts,
  getColorPalettes,
} from "../services/contentService";
import { TEMPLATE_FAMILIES, LENS_TEMPLATES_EXPANDED, SAMPLE_STUDIO_TEMPLATES, STOCK_PHOTOS, LENS_FILTER_MAP } from "../data/mockData";
import { TEMPLATE_STAT_DESIGNS } from "../data/templateStatDesigns";

// ---------------------------------------------------------------------------
// Mock-data fallback loaders (tier 2)
// ---------------------------------------------------------------------------

function loadMockFamilies(): TemplateFamily[] {
  return TEMPLATE_FAMILIES;
}

function loadMockLenses(): LensTemplate[] {
  return [...LENS_TEMPLATES_EXPANDED, ...SAMPLE_STUDIO_TEMPLATES];
}

function loadMockStockPhotos(): PhotoSource[] {
  return STOCK_PHOTOS;
}

function loadMockFilters(): Record<string, string> {
  return LENS_FILTER_MAP;
}

/** Firebase wins when it has anything to say; silence means keep the mock. */
function pickList<T>(fromFirebase: T[], fallback: T[]): T[] {
  return fromFirebase.length > 0 ? fromFirebase : fallback;
}

/**
 * Fold what Firestore returned onto the hardcoded library, per collection.
 *
 * Deliberately not all-or-nothing: a store with lenses but no stock photos
 * must not blank the photo picker, and one configured stat design must not
 * orphan the other 28 templates. Lists replace wholesale when non-empty, so
 * unpublishing a lens really removes it; records merge, so an admin entry
 * overrides its hardcoded namesake and the rest keep working.
 */
export function resolveBundle(
  fromFirebase: ContentBundle,
  mock: ContentBundle
): ContentBundle {
  return {
    templateFamilies: pickList(fromFirebase.templateFamilies, mock.templateFamilies),
    statDesigns: { ...mock.statDesigns, ...fromFirebase.statDesigns },
    lensTemplates: pickList(fromFirebase.lensTemplates, mock.lensTemplates),
    stickers: pickList(fromFirebase.stickers, mock.stickers),
    stockPhotos: pickList(fromFirebase.stockPhotos, mock.stockPhotos),
    lensFilters: { ...mock.lensFilters, ...fromFirebase.lensFilters },
    fonts: fromFirebase.fonts,
    colorPalettes: fromFirebase.colorPalettes,
  };
}

/** The full mock bundle — tier 2, and the initial state before any fetch. */
function loadMockBundle(): ContentBundle {
  return {
    templateFamilies: loadMockFamilies(),
    statDesigns: TEMPLATE_STAT_DESIGNS,
    lensTemplates: loadMockLenses(),
    stickers: loadMockStickers(),
    stockPhotos: loadMockStockPhotos(),
    lensFilters: loadMockFilters(),
    // No hardcoded equivalents — the editor keeps its own built-in font and
    // colour lists, and these only add to them.
    fonts: [],
    colorPalettes: [],
  };
}

function loadMockStickers(): StickerItem[] {
  return [
    // ── Transparent stat overlays (no bg, sits on photo) ──
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

    // ── Metric pills (colored bg) ──
    { id: "st_p_hr", content: "{value} {unit}", label: "Heart Rate", category: "Heart Rate", type: "metric", statKey: "avg_hr", format: "{value} {unit}", bgGradient: "from-rose-500 to-pink-600" },
    { id: "st_p_elev", content: "+{value}{unit}", label: "Elevation", category: "Elevation", type: "metric", statKey: "elev_gain", format: "+{value}{unit}", bgGradient: "from-emerald-600 to-green-500" },
    { id: "st_p_cal", content: "{value} {unit}", label: "Calories", category: "Energy", type: "metric", statKey: "calories", format: "{value} {unit}", bgGradient: "from-orange-500 to-red-500" },
    { id: "st_p_speed", content: "{value} km/h", label: "Speed", category: "Speed", type: "metric", statKey: "speed", format: "{value} km/h", bgGradient: "from-cyan-500 to-blue-600" },
    { id: "st_p_cad", content: "{value} {unit}", label: "Cadence", category: "Cadence", type: "metric", statKey: "cadence", format: "{value} {unit}", bgGradient: "from-violet-500 to-purple-600" },
    { id: "st_p_pwr", content: "{value} {unit}", label: "Power", category: "Power", type: "metric", statKey: "power", format: "{value} {unit}", bgGradient: "from-yellow-400 to-amber-600" },
    { id: "st_p_temp", content: "{value}{unit}", label: "Temperature", category: "Weather", type: "metric", statKey: "temp", format: "{value}{unit}", bgGradient: "from-sky-400 to-indigo-500" },
    { id: "st_p_dist", content: "{value} {unit}", label: "Distance", category: "Distance", type: "metric", statKey: "distance", format: "{value} {unit}", bgGradient: "from-blue-500 to-indigo-600" },
    { id: "st_p_pace", content: "{value}", label: "Pace", category: "Pace", type: "metric", statKey: "pace", bgGradient: "from-teal-500 to-cyan-600" },

    // ── Editor's own built-in library (badges, locations, stat pills) ──
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
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface ContentContextValue extends ContentBundle {
  /** True while the initial Firebase fetch is in-flight. */
  loading: boolean;
  /** Error message (null = no error). */
  error: string | null;
  /** Re-fetch all content from Firebase, bypassing cache. */
  refreshAll: () => Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE_CONTENT === "true";

interface ContentProviderProps {
  children: ReactNode;
}

export function ContentProvider({ children }: ContentProviderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Seeded with the mock bundle rather than empties: consumers render on the
  // very first frame, before the Firebase round-trip resolves, and none of
  // them has to guard against an empty list that only exists for one tick.
  const [bundle, setBundle] = useState<ContentBundle>(loadMockBundle);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    const mock = loadMockBundle();

    if (!USE_FIREBASE) {
      // Skip Firebase entirely — use mock data
      setBundle(mock);
      setLoading(false);
      return;
    }

    try {
      // Tier 1: Firebase
      const [families, designs, lenses, stickers, photos, filters, fonts, palettes] =
        await Promise.all([
          getTemplateFamilies(),
          getStatDesigns(),
          getLensTemplates(),
          getStickers(),
          getStockPhotos(),
          getLensFilters(),
          getFonts(),
          getColorPalettes(),
        ]);

      setBundle(
        resolveBundle(
          {
            templateFamilies: families,
            statDesigns: designs,
            lensTemplates: lenses,
            stickers,
            stockPhotos: photos,
            lensFilters: filters,
            fonts,
            colorPalettes: palettes,
          },
          mock
        )
      );
      setLoading(false);
      return;
    } catch (err) {
      console.warn("[ContentContext] Firebase fetch failed, falling back to mock data", err);
    }

    // Tier 2: Mock data fallback
    setBundle(mock);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const value: ContentContextValue = {
    ...bundle,
    loading,
    error,
    refreshAll: loadContent,
  };

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    throw new Error("useContent must be used within a <ContentProvider>");
  }
  return ctx;
}
