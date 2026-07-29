import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Share, Settings, ChevronRight, Activity, Timer, Mountain, Flame,
  Home, User, Camera, FolderKanban, Target, LogOut, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchAthleteStats, fetchActivities } from "../services/stravaApi";
import { aggregateTotals, activityToActivityData, formatPace, formatDistance } from "../services/stravaTransformers";
import type { StravaActivityStats } from "../types";

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Format an aggregated distance (km) for display. */
function showDistance(km: number): string {
  return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

// ---------------------------------------------------------------------------
// Fallback mock stats (preserved for graceful degradation)
// ---------------------------------------------------------------------------

const MOCK_NAME = "Aarav Singh";
const MOCK_HANDLE = "@aarav.singh";
const MOCK_BIO = "Runner • Explorer • Building discipline everyday.";
const MOCK_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDit-KPg1Q8d1xm8TmBI5uh13_09nw2HL5_rZbG09VB_d78urxZ-CUNX4m8v2-xkkko4M-kwbSRfU1vI7ZsB2-gUBqT7yqeFMK7AswhQHewRE1Jg7B8DjjTTH_DOr_Fv3AcSd4MsrfY-Qk9CelFhBjKV3GnYZaWGqApTGwTBU9Y4ARrsX8pDudX9NyJq3Gl52u_3bGBHS-x0n7eA2CCWWfVfRkmHaRJXhhqpyUyVk_IVBzRGE55HMx2FCWg2o5447Z_PZud2EJ1gmQ";

const MOCK_STATS = { count: 45, distanceKm: 412, following: 12 };
const MOCK_WEEK = { distance: "8.4 km", workouts: 2, time: "52m total" };
const MOCK_HIGHLIGHTS = [
  { label: "Total Distance", value: "412 km", icon: Activity },
  { label: "Total Time", value: "38h 45m", icon: Timer },
  { label: "Elev Gain", value: "1,920 m", icon: Mountain },
  { label: "Calories", value: "12,340", icon: Flame },
];

// ── Activity-card shape shared by ProfileScreen ───────────────────────────

interface ProfileActivity {
  id: string;
  title: string;
  summary: string;
  timeAgo: string;
  iconType: "activity" | "target" | "flame" | "mountain";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { athlete, logout } = useAuth();

  // ── State (starts with mock values, replaced on successful fetch) ──────

  const [stats, setStats] = useState(MOCK_STATS);
  const [weekStats, setWeekStats] = useState(MOCK_WEEK);
  const [highlights, setHighlights] = useState(MOCK_HIGHLIGHTS);
  const [recentActivities, setRecentActivities] = useState<ProfileActivity[]>([
    {
      id: "mock_prof_1", title: "Morning Run",
      summary: "8.4 km • 6:12 /km • 52:18", timeAgo: "2h ago",
      iconType: "activity",
    },
    {
      id: "mock_prof_2", title: "Cycling",
      summary: "35.2 km • 2:59 /km • 1:45:32", timeAgo: "Yesterday",
      iconType: "target",
    },
  ]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  // ── Fetch real data ────────────────────────────────────────────────────

  useEffect(() => {
    if (!athlete) return;

    const athleteId = athlete.id;

    // Fetch stats
    fetchAthleteStats(athleteId)
      .then((s: StravaActivityStats) => {
        const all = aggregateTotals(s.all_run_totals, s.all_ride_totals, s.all_swim_totals);
        const recent = aggregateTotals(s.recent_run_totals, s.recent_ride_totals, s.recent_swim_totals);

        setStats({
          count: all.count,
          distanceKm: all.distanceKm,
          following: stats.following, // keep mock following (Strava doesn't expose it in /athletes/{id}/stats)
        });

        setWeekStats({
          distance: showDistance(recent.distanceKm),
          workouts: recent.count,
          time: recent.movingTimeFormatted,
        });

        setHighlights([
          { label: "Total Distance", value: showDistance(all.distanceKm), icon: Activity },
          { label: "Total Time", value: all.movingTimeFormatted, icon: Timer },
          { label: "Elev Gain", value: `${all.elevationGainM.toLocaleString()} m`, icon: Mountain },
          // Calories requires summing from activities; skip for now
          { label: "Calories", value: "—", icon: Flame },
        ]);
      })
      .catch((err) => console.warn("Failed to load athlete stats:", err))
      .finally(() => setStatsLoaded(true));

    // Fetch recent activities for the list
    fetchActivities({ per_page: 5 })
      .then((acts) => {
        if (acts && acts.length > 0) {
          setRecentActivities(
            acts.slice(0, 5).map((a) => {
              const ad = activityToActivityData(a);
              return {
                id: ad.id,
                title: ad.title,
                summary: `${ad.distance} km • ${ad.pace} /km • ${ad.time}`,
                timeAgo: ad.timeAgo,
                iconType: ad.iconType,
              };
            })
          );
        }
      })
      .catch((err) => console.warn("Failed to load recent activities:", err));
  }, [athlete]);

  // ── Derive athlete info ────────────────────────────────────────────────

  const displayName = athlete
    ? `${athlete.firstname} ${athlete.lastname}`
    : MOCK_NAME;

  const displayHandle = athlete
    ? `@${athlete.firstname?.toLowerCase()}.${athlete.lastname?.toLowerCase()}`
    : MOCK_HANDLE;

  const displayBio = athlete
    ? `${athlete.city ? `${athlete.city}${athlete.state ? `, ${athlete.state}` : ""}` : "Athlete"} • Powered by Strava`
    : MOCK_BIO;

  const avatarUrl = athlete?.profile_medium || athlete?.profile || MOCK_AVATAR;

  return (
    <div className="bg-ink text-text-primary min-h-screen pb-24 md:pb-0 font-ui relative">
      <header className="flex justify-end items-center px-screen-gutter pt-12 pb-6">
        <div className="flex gap-3">
          <button onClick={() => navigate("/camera")} className="w-10 h-10 flex items-center justify-center rounded-full bg-ember text-ink transition-colors">
            <Camera className="w-5 h-5 fill-ink" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface transition-colors">
            <Share className="text-text-primary w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface transition-colors"
            title="Disconnect Strava"
          >
            <LogOut className="text-text-secondary w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-screen-gutter max-w-2xl mx-auto">
        {/* Profile Header */}
        <section className="flex items-center gap-6 mb-8">
          <div className="relative w-24 h-24 rounded-full p-[3px] bg-ember shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-surface border-4 border-ink">
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <h1 className="text-section-header mb-1">{displayName}</h1>
            <p className="text-label text-text-secondary mb-3">{displayHandle}</p>
            <p className="text-body text-text-secondary text-sm leading-snug">
              {displayBio}
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="flex justify-between items-center py-6 hairline-border-y mb-section-v-rhythm">
          <div className="flex flex-col items-center flex-1">
            <span className="text-stat-value text-text-primary mb-1">{stats.count}</span>
            <span className="text-label text-text-secondary">Activities</span>
          </div>
          <div className="w-[1px] h-10 bg-hairline"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-stat-value text-text-primary mb-1">{showDistance(stats.distanceKm)}</span>
            <span className="text-label text-text-secondary">Total Distance</span>
          </div>
          <div className="w-[1px] h-10 bg-hairline"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-stat-value text-text-primary mb-1">{stats.following}</span>
            <span className="text-label text-text-secondary">Following</span>
          </div>
        </section>

        {/* This Week */}
        <section className="bg-surface rounded-lg p-5 mb-section-v-rhythm hairline-border relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-ember opacity-10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="text-label text-text-secondary mb-1">Recent Activity</h3>
              <div className="text-metric-md text-text-primary">{weekStats.distance}</div>
            </div>
            <div className="text-right">
              <span className="text-label text-text-secondary">{weekStats.workouts} Workouts</span>
              <p className="text-stat-value text-ember">{weekStats.time}</p>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-section-v-rhythm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-section-header">Recent Activity</h2>
            <button className="text-label text-ember hover:opacity-80 transition-opacity">View all</button>
          </div>

          <div className="flex flex-col gap-card-stack-gap">
            {recentActivities.map((item) => {
              const IconComponent =
                item.iconType === "target" ? Target
                  : item.iconType === "flame" ? Flame
                    : item.iconType === "mountain" ? Mountain
                      : Activity;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate("/editor")}
                  className="bg-surface rounded-lg p-4 flex items-center hairline-border hover:bg-surface-raised transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-sm bg-ember-dim flex items-center justify-center shrink-0 mr-4">
                    <IconComponent className="text-ember w-6 h-6" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-stat-value mb-1">{item.title}</h4>
                    <p className="text-label text-text-secondary">{item.summary}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-tool-caption text-text-secondary">{item.timeAgo}</span>
                    <ChevronRight className="text-text-secondary w-5 h-5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Highlights */}
        <section className="mb-section-v-rhythm">
          <h2 className="text-section-header mb-6">Highlights</h2>
          <div className="bg-surface rounded-lg p-6 hairline-border grid grid-cols-4 gap-4">
            {highlights.map((h) => {
              const HIcon = h.icon;
              return (
                <div key={h.label} className="flex flex-col items-center text-center">
                  <div className="h-10 flex items-center justify-center mb-3">
                    <HIcon className="text-ember w-6 h-6" />
                  </div>
                  <span className="text-stat-value mb-1">{h.value}</span>
                  <span className="text-tool-caption text-text-secondary">{h.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full z-50 rounded-t-xl hairline-border-t bg-surface flex justify-around items-center px-4 py-3 pb-safe" aria-label="Main navigation">
        <button onClick={() => navigate("/home")} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-text-primary transition-colors" aria-label="Home">
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => navigate("/camera")} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-ember transition-colors" aria-label="Camera">
          <Camera className="w-6 h-6" />
        </button>
        <button onClick={() => navigate("/projects")} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-ember transition-colors" aria-label="Projects">
          <FolderKanban className="w-6 h-6" />
        </button>
        <button className="flex flex-col items-center justify-center bg-surface-raised text-ember rounded-full p-3 transition-colors" aria-label="Profile" aria-current="page">
          <User className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
