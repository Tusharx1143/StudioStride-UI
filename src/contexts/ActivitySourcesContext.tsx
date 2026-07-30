/**
 * Activity Sources context.
 *
 * Orchestrates all registered activity source adapters. Provides a single
 * combined, sorted, filterable activity feed to the rest of the app.
 *
 * Must be placed inside <AuthProvider> and <HealthConnectProvider>.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useHealthConnect } from "./HealthConnectContext";
import { createStravaSourceAdapter } from "../sources/adapters/StravaSourceAdapter";
import { createHealthConnectSourceAdapter } from "../sources/adapters/HealthConnectSourceAdapter";
import { MOCK_SOURCE } from "../sources/adapters/MockSourceAdapter";
import { subscribeToDistanceUnit } from "../utils/unitPreference";

/** Activities requested per page. */
const PAGE_SIZE = 20;
import type {
  ActivitySource,
  ActivitySourceId,
  SourceStats,
  UnifiedActivity,
} from "../sources/types";

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface SourceState {
  connected: boolean;
  loading: boolean;
  activities: UnifiedActivity[];
  stats: SourceStats | null;
}

interface ActivitySourcesContextValue {
  /** Per-source state keyed by source ID. */
  sourceStates: Record<string, SourceState>;
  /** All activities from all connected sources, sorted by date desc. */
  combinedActivities: UnifiedActivity[];
  /** True while any source is fetching. */
  loading: boolean;
  error: string | null;

  // ── Actions ───────────────────────────────────────────────────────────
  connectSource: (id: ActivitySourceId) => Promise<void>;
  disconnectSource: (id: ActivitySourceId) => void;
  refreshAll: () => Promise<void>;
  /** Fetch the next page of older activities. */
  loadMore: () => Promise<void>;
  /** False once a fetch comes back short, meaning there is nothing older. */
  hasMore: boolean;
  /** True while a "load more" is in flight; the list stays on screen. */
  isLoadingMore: boolean;

  // ── Filters ───────────────────────────────────────────────────────────
  activeSourceFilter: ActivitySourceId | "all";
  setSourceFilter: (filter: ActivitySourceId | "all") => void;
  activeTypeFilter: string | "all";
  setTypeFilter: (filter: string | "all") => void;
  /** Available activity type labels derived from the combined feed. */
  availableTypes: string[];
  /** Activities after applying current source + type filters. */
  filteredActivities: UnifiedActivity[];
}

const ActivitySourcesContext = createContext<ActivitySourcesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ActivitySourcesProvider({ children }: { children: ReactNode }) {
  const { status: stravaStatus, athlete } = useAuth();
  const {
    state: hcState,
    daily: healthDaily,
    connect: hcConnect,
    disconnect: hcDisconnect,
  } = useHealthConnect();

  // ── Adapters ──────────────────────────────────────────────────────────

  const [stravaSource] = useState<ActivitySource>(() =>
    createStravaSourceAdapter(
      () => stravaStatus,
      () => athlete?.id ?? null,
    ),
  );

  const [hcSource] = useState<ActivitySource>(() =>
    createHealthConnectSourceAdapter(
      () => healthDaily,
      () => ({
        available: hcState.available,
        authorized: hcState.authorized,
        loading: hcState.loading,
      }),
      hcConnect,
      hcDisconnect,
    ),
  );

  // ── Source state ──────────────────────────────────────────────────────

  const [sourceStates, setSourceStates] = useState<Record<string, SourceState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Pagination ────────────────────────────────────────────────────────
  //
  // The feed used to be a hardcoded `{ limit: 20 }` with no way to reach
  // anything older, so a runner with three years of history could only see the
  // last two weeks. `SourceFetchParams` already declared `before`/`after`; the
  // plumbing existed and was unused.
  const [pageCount, setPageCount] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // ── Filters ───────────────────────────────────────────────────────────

  const [activeSourceFilter, setSourceFilter] = useState<ActivitySourceId | "all">("all");
  const [activeTypeFilter, setTypeFilter] = useState<string | "all">("all");

  // ── Determine which sources are active ────────────────────────────────

  const isStravaConnected = stravaStatus === "authenticated";
  const isHcConnected = hcState.available && hcState.authorized;
  const useMock = !isStravaConnected && !isHcConnected;

  const activeSourceIds = useMemo(() => {
    const ids: ActivitySourceId[] = [];
    if (isStravaConnected) ids.push("strava");
    if (isHcConnected) ids.push("healthconnect");
    if (useMock) ids.push("mock");
    return ids;
  }, [isStravaConnected, isHcConnected, useMock]);

  // ── Fetch all active sources ──────────────────────────────────────────

  const fetchAll = useCallback(async (pages: number = 1) => {
    // Only the first page blanks the screen; later pages keep what is on it.
    if (pages === 1) setLoading(true);
    setError(null);

    const newStates: Record<string, SourceState> = {};
    const requested = PAGE_SIZE * pages;
    let sawAFullPage = false;

    const fetchSource = async (source: ActivitySource) => {
      try {
        const activities = await source.fetchActivities({ limit: requested });
        if (activities.length >= requested) sawAFullPage = true;
        let stats: SourceStats | null = null;
        try {
          if (source.fetchStats) {
            stats = await source.fetchStats();
          }
        } catch {
          // stats are optional
        }
        newStates[source.id] = {
          connected: source.isConnected(),
          loading: false,
          activities,
          stats,
        };
      } catch (err) {
        newStates[source.id] = {
          connected: source.isConnected(),
          loading: false,
          activities: [],
          stats: null,
        };
        console.warn(`[ActivitySources] Failed to fetch from ${source.id}:`, err);
      }
    };

    const promises: Promise<void>[] = [];

    if (isStravaConnected) {
      promises.push(fetchSource(stravaSource));
    }
    if (isHcConnected) {
      promises.push(fetchSource(hcSource));
    }
    if (useMock) {
      promises.push(fetchSource(MOCK_SOURCE));
    }

    await Promise.allSettled(promises);

    setSourceStates(newStates);
    // If no source filled the page, there is nothing older to ask for.
    setHasMore(sawAFullPage);
    setLoading(false);
    setIsLoadingMore(false);
  }, [isStravaConnected, isHcConnected, useMock, stravaSource, hcSource]);

  // Fetch on mount and when active sources change
  useEffect(() => {
    setPageCount(1);
    fetchAll(1);
  }, [fetchAll]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const next = pageCount + 1;
    setPageCount(next);
    await fetchAll(next);
  }, [fetchAll, hasMore, isLoadingMore, pageCount]);

  // Re-fetch when the measurement system changes: display strings are baked
  // into UnifiedActivity by the adapters, so they have to be rebuilt.
  useEffect(() => {
    return subscribeToDistanceUnit(() => {
      fetchAll(pageCount);
    });
  }, [fetchAll, pageCount]);

  // ── Combined activities (merged + sorted) ─────────────────────────────

  const combinedActivities = useMemo(() => {
    const all: UnifiedActivity[] = [];
    for (const state of Object.values(sourceStates)) {
      all.push(...state.activities);
    }
    // Sort by date descending (newest first)
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // Deduplicate by ID (last write wins)
    const seen = new Set<string>();
    return all.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [sourceStates]);

  // ── Derived: available type labels ────────────────────────────────────

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const a of combinedActivities) {
      types.add(a.type);
    }
    return Array.from(types).sort();
  }, [combinedActivities]);

  // ── Filtered activities ──────────────────────────────────────────────

  const filteredActivities = useMemo(() => {
    return combinedActivities.filter((a) => {
      if (activeSourceFilter !== "all" && a.sourceId !== activeSourceFilter) return false;
      if (activeTypeFilter !== "all" && a.type !== activeTypeFilter) return false;
      return true;
    });
  }, [combinedActivities, activeSourceFilter, activeTypeFilter]);

  // ── Actions ───────────────────────────────────────────────────────────

  const connectSource = useCallback(
    async (id: ActivitySourceId) => {
      switch (id) {
        case "strava":
          stravaSource.connect();
          break;
        case "healthconnect":
          await hcSource.connect();
          break;
      }
    },
    [stravaSource, hcSource],
  );

  const disconnectSource = useCallback(
    (id: ActivitySourceId) => {
      switch (id) {
        case "strava":
          stravaSource.disconnect();
          break;
        case "healthconnect":
          hcSource.disconnect();
          break;
      }
    },
    [stravaSource, hcSource],
  );

  // ── Value ─────────────────────────────────────────────────────────────

  const value: ActivitySourcesContextValue = {
    sourceStates,
    combinedActivities,
    loading,
    error,
    connectSource,
    disconnectSource,
    refreshAll: () => fetchAll(pageCount),
    loadMore,
    hasMore,
    isLoadingMore,
    activeSourceFilter,
    setSourceFilter,
    activeTypeFilter,
    setTypeFilter,
    availableTypes,
    filteredActivities,
  };

  return (
    <ActivitySourcesContext.Provider value={value}>
      {children}
    </ActivitySourcesContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActivitySources(): ActivitySourcesContextValue {
  const ctx = useContext(ActivitySourcesContext);
  if (!ctx) {
    throw new Error("useActivitySources must be used within an ActivitySourcesProvider");
  }
  return ctx;
}
