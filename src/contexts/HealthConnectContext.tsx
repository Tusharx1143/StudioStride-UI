/**
 * Google Health Connect context.
 *
 * Provides:
 * - availability & authorization state
 * - daily + weekly health data snapshots
 * - connect / disconnect / refresh actions
 * - graceful web fallback (mock data for browser dev)
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { HealthConnectState, DailyHealthData, WeeklyHealthData } from "../types";
import {
  isAvailable,
  checkPermissions,
  requestPermissions,
  queryDailyHealthData,
  queryWeeklyHealthData,
} from "../services/healthConnect";

// ---------------------------------------------------------------------------
// Mock data (web fallback / graceful degradation)
// ---------------------------------------------------------------------------

const MOCK_DAILY: DailyHealthData = {
  steps: 8432,
  distanceKm: 6.1,
  caloriesBurned: 342,
  heartRate: { avg: 112, max: 156, resting: 62 },
  sleepHours: 7.5,
  weightKg: 72.5,
};

const MOCK_WEEKLY: WeeklyHealthData = {
  totalSteps: 52180,
  avgDailySteps: 7454,
  totalDistanceKm: 38.2,
  totalCalories: 2390,
  avgRestingHeartRate: 61,
  avgSleepHours: 7.2,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface HealthConnectContextValue {
  state: HealthConnectState;
  daily: DailyHealthData | null;
  weekly: WeeklyHealthData | null;
  /** Request permissions from the user, then fetch data. */
  connect: () => Promise<void>;
  /** Clear local state (does NOT revoke system permissions). */
  disconnect: () => void;
  /** Re-fetch daily + weekly data without re-requesting permissions. */
  refreshData: () => Promise<void>;
  /** Request permissions only (no data fetch). */
  requestPermissionsOnly: () => Promise<boolean>;
}

const HealthConnectContext = createContext<HealthConnectContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function HealthConnectProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthConnectState>({
    available: false,
    authorized: false,
    loading: true,
    error: null,
  });
  const [daily, setDaily] = useState<DailyHealthData | null>(null);
  const [weekly, setWeekly] = useState<WeeklyHealthData | null>(null);

  // -----------------------------------------------------------------------
  // Check availability & existing permissions on mount
  // -----------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const avail = await isAvailable();
      if (cancelled) return;

      if (!avail.available) {
        // Web fallback — use mock data so the UI still works
        setState({ available: false, authorized: false, loading: false, error: null });
        setDaily(MOCK_DAILY);
        setWeekly(MOCK_WEEKLY);
        return;
      }

      setState((prev) => ({ ...prev, available: true, loading: true }));

      const authorized = await checkPermissions();
      if (cancelled) return;

      setState({
        available: true,
        authorized,
        loading: false,
        error: null,
      });

      if (authorized) {
        await fetchData();
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const [dailyData, weeklyData] = await Promise.all([
        queryDailyHealthData(),
        queryWeeklyHealthData(),
      ]);
      setDaily(dailyData);
      setWeekly(weeklyData);
      setState((prev) => ({ ...prev, loading: false, error: null }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch health data",
      }));
    }
  }, []);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const granted = await requestPermissions();
      setState((prev) => ({ ...prev, authorized: granted }));
      if (granted) {
        await fetchData();
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Permission request failed",
      }));
    }
  }, [fetchData]);

  const disconnect = useCallback(() => {
    setState({
      available: true,
      authorized: false,
      loading: false,
      error: null,
    });
    setDaily(null);
    setWeekly(null);
  }, []);

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const requestPermissionsOnly = useCallback(async () => {
    const granted = await requestPermissions();
    setState((prev) => ({ ...prev, authorized: granted }));
    return granted;
  }, []);

  return (
    <HealthConnectContext.Provider
      value={{
        state,
        daily,
        weekly,
        connect,
        disconnect,
        refreshData,
        requestPermissionsOnly,
      }}
    >
      {children}
    </HealthConnectContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHealthConnect(): HealthConnectContextValue {
  const ctx = useContext(HealthConnectContext);
  if (!ctx) {
    throw new Error("useHealthConnect must be used within a HealthConnectProvider");
  }
  return ctx;
}
