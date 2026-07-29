/**
 * Strava API client.
 *
 * All calls go through the Express BFF proxy (/api/strava/…) so tokens
 * never reach the browser. The session cookie (sid) is sent automatically
 * when credentials: "include" is passed.
 */

import { AuthExpiredError, StravaApiError } from "../types";
import type { StravaActivity, StravaActivityStats, StravaAthlete } from "../types";

const BASE = "/api/strava";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new AuthExpiredError();
    }
    const text = await res.text().catch(() => "unknown error");
    throw new StravaApiError(text, res.status);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fetch the currently-authenticated athlete's profile. */
export function fetchAthlete(): Promise<StravaAthlete> {
  return request<StravaAthlete>("/athlete");
}

/** Fetch activities for the authenticated athlete. */
export function fetchActivities(
  params?: {
    before?: number;
    after?: number;
    page?: number;
    per_page?: number;
  }
): Promise<StravaActivity[]> {
  const qs = new URLSearchParams();
  if (params?.before !== undefined) qs.set("before", String(params.before));
  if (params?.after !== undefined) qs.set("after", String(params.after));
  if (params?.page !== undefined) qs.set("page", String(params.page));
  if (params?.per_page !== undefined) qs.set("per_page", String(params.per_page));
  const q = qs.toString();
  return request<StravaActivity[]>(`/athlete/activities${q ? "?" + q : ""}`);
}

/** Fetch stats for a specific athlete. */
export function fetchAthleteStats(athleteId: number): Promise<StravaActivityStats> {
  return request<StravaActivityStats>(`/athletes/${athleteId}/stats`);
}

/** Fetch a single detailed activity. */
export function fetchActivity(id: number): Promise<StravaActivity> {
  return request<StravaActivity>(`/activities/${id}`);
}

/** Fetch activity streams (time-series data). */
export function fetchActivityStreams(
  id: number,
  keys: string[] = ["time", "distance", "latlng", "altitude", "heartrate", "cadence", "watts", "temp", "moving", "grade_smooth", "velocity_smooth"]
): Promise<unknown> {
  return request(`/activities/${id}/streams?keys=${keys.join(",")}&key_by_type=true`);
}

/** Check if the backend session is still valid. */
export function checkSession(): Promise<StravaAthlete> {
  return fetchAthlete();
}

/** Log out on the server — deletes the session and clears the cookie. */
export function logout(): Promise<void> {
  return fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new StravaApiError("Logout failed", res.status);
  });
}

/** Explicitly refresh the session's tokens. */
export function refreshSession(): Promise<void> {
  return fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new AuthExpiredError();
  });
}
