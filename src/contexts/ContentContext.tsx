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
import { TEMPLATE_FAMILIES, LENS_TEMPLATES_EXPANDED, STOCK_PHOTOS, LENS_FILTER_MAP } from "../data/mockData";
import { TEMPLATE_STAT_DESIGNS } from "../data/templateStatDesigns";

// ---------------------------------------------------------------------------
// Mock-data fallback loaders (tier 2)
// ---------------------------------------------------------------------------

function loadMockFamilies(): TemplateFamily[] {
  return TEMPLATE_FAMILIES;
}

function loadMockLenses(): LensTemplate[] {
  return LENS_TEMPLATES_EXPANDED;
}

function loadMockStockPhotos(): PhotoSource[] {
  return STOCK_PHOTOS;
}

function loadMockFilters(): Record<string, string> {
  return LENS_FILTER_MAP;
}

function loadMockStickers(): StickerItem[] {
  return [
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
