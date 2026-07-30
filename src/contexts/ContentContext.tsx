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
import type { StickerItem, ContentBundle } from "../types/content";
import {
  getTemplateFamilies,
  getStatDesigns,
  getLensTemplates,
  getStickers,
  getStockPhotos,
  getLensFilters,
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
  const [bundle, setBundle] = useState<ContentBundle>({
    templateFamilies: [],
    statDesigns: {},
    lensTemplates: [],
    stickers: [],
    stockPhotos: [],
    lensFilters: {},
  });

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!USE_FIREBASE) {
      // Skip Firebase entirely — use mock data
      setBundle({
        templateFamilies: loadMockFamilies(),
        statDesigns: TEMPLATE_STAT_DESIGNS,
        lensTemplates: loadMockLenses(),
        stickers: loadMockStickers(),
        stockPhotos: loadMockStockPhotos(),
        lensFilters: loadMockFilters(),
      });
      setLoading(false);
      return;
    }

    try {
      // Tier 1: Firebase
      const [families, designs, lenses, stickers, photos, filters] =
        await Promise.all([
          getTemplateFamilies(),
          getStatDesigns(),
          getLensTemplates(),
          getStickers(),
          getStockPhotos(),
          getLensFilters(),
        ]);

      const hasContent =
        families.length > 0 ||
        Object.keys(designs).length > 0 ||
        lenses.length > 0 ||
        stickers.length > 0 ||
        photos.length > 0 ||
        Object.keys(filters).length > 0;

      if (hasContent) {
        setBundle({
          templateFamilies: families,
          statDesigns: designs,
          lensTemplates: lenses,
          stickers,
          stockPhotos: photos,
          lensFilters: filters,
        });
        setLoading(false);
        return;
      }

      // Firebase returned empty — fall through to mock data
    } catch (err) {
      console.warn("[ContentContext] Firebase fetch failed, falling back to mock data", err);
    }

    // Tier 2: Mock data fallback
    setBundle({
      templateFamilies: loadMockFamilies(),
      statDesigns: TEMPLATE_STAT_DESIGNS,
      lensTemplates: loadMockLenses(),
      stickers: loadMockStickers(),
      stockPhotos: loadMockStockPhotos(),
      lensFilters: loadMockFilters(),
    });
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
