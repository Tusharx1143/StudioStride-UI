/**
 * Strava OAuth authentication context.
 *
 * Provides:
 * - auth status (loading / authenticated / unauthenticated)
 * - the current athlete profile
 * - login / logout actions
 * - RequireAuth guard for protected routes
 *
 * For dual-auth (Strava + Health Connect), use `RequireAnyAuth` from App.tsx
 * or pass `allowHealthConnect` to `RequireAuth`.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAthlete, logout as apiLogout } from "../services/stravaApi";
import type { AuthStatus, StravaAthlete } from "../types";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  status: AuthStatus;
  athlete: StravaAthlete | null;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On mount, check if we have a valid session by fetching the athlete.
  useEffect(() => {
    let cancelled = false;

    fetchAthlete()
      .then((a) => {
        if (cancelled) return;
        setAthlete(a);
        setStatus("authenticated");
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setAthlete(null);
        setStatus("unauthenticated");
        setError(null); // no auth — not an error, just not logged in
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    // Full page redirect to Strava OAuth via our server
    window.location.href = "/api/auth/login";
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Clear locally even if the server call fails
    }
    setAthlete(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ status, athlete, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Route guard
// ---------------------------------------------------------------------------

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-ember border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-label">Connecting to Strava…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // will redirect via the useEffect above
  }

  return <>{children}</>;
}
