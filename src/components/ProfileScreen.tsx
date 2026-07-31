import { motion } from "motion/react";
import {
  Share, Settings, ChevronRight, Activity, Timer, Mountain, Flame,
  Home, User, Camera, FolderKanban, Target, LogOut, Loader2,
  Heart, Footprints, Moon, Sparkles, Sun,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { DistanceUnit } from "../utils/units";
import { formatDistance as formatDistanceInUnit, paceSuffix } from "../utils/units";
import { setDistanceUnit, useDistanceUnit } from "../utils/unitPreference";
import BottomNav from "./BottomNav";
import { useAuth } from "../contexts/AuthContext";
import { useHealthConnect } from "../contexts/HealthConnectContext";
import { useActivitySources } from "../contexts/ActivitySourcesContext";
import { useTheme } from "../contexts/ThemeContext";
import SourceBadge from "./SourceBadge";
import { getEnabledSources } from "../sources/registry";

// ---------------------------------------------------------------------------
// Fallback mock data (when Strava is not connected)
// ---------------------------------------------------------------------------

const MOCK_NAME = "Aarav Singh";
const MOCK_HANDLE = "@aarav.singh";
const MOCK_BIO = "Runner • Explorer • Building discipline everyday.";
const MOCK_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDit-KPg1Q8d1xm8TmBI5uh13_09nw2HL5_rZbG09VB_d78urxZ-CUNX4m8v2-xkkko4M-kwbSRfU1vI7ZsB2-gUBqT7yqeFMK7AswhQHewRE1Jg7B8DjjTTH_DOr_Fv3AcSd4MsrfY-Qk9CelFhBjKV3GnYZaWGqApTGwTBU9Y4ARrsX8pDudX9NyJq3Gl52u_3bGBHS-x0n7eA2CCWWfVfRkmHaRJXhhqpyUyVk_IVBzRGE55HMx2FCWg2o5447Z_PZud2EJ1gmQ";

const MOCK_FOLLOWING = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Totals arrive in km from the sources; render them in the user's system. */
function showDistance(km: number, unit: DistanceUnit): string {
  const value = Number(formatDistanceInUnit(km * 1000, unit));
  return value >= 100 ? `${Math.round(value)} ${unit}` : `${value.toFixed(1)} ${unit}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const distanceUnit = useDistanceUnit();
  const navigate = useNavigate();
  const { athlete, logout } = useAuth();
  const { resolved: theme, toggle: toggleTheme } = useTheme();
  const { state: hcState, daily: healthDaily, connect: hcConnect, disconnect: hcDisconnect } = useHealthConnect();
  const { sourceStates, combinedActivities, loading } = useActivitySources();

  // ── Derive per-source stats ───────────────────────────────────────────

  const stravaStats = sourceStates["strava"]?.stats ?? null;
  const stravaActivities = combinedActivities.filter((a) => a.sourceId === "strava");
  const recentActivities = combinedActivities.slice(0, 5);

  // ── Derive athlete info ───────────────────────────────────────────────

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

  // ── Aggregate totals (from all sources) ───────────────────────────────

  const allStats = {
    count: stravaStats?.totalActivities ?? combinedActivities.length,
    distanceKm: stravaStats?.totalDistanceKm ?? 0,
    following: athlete?.follower_count ?? MOCK_FOLLOWING,
  };

  const weekActivityCount = recentActivities.length;
  const weekDistance =
    recentActivities.reduce((sum, a) => sum + a.distanceMeters, 0) / 1000;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-ink text-text-primary min-h-screen pb-24 md:pb-0 font-ui relative"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex justify-end items-center px-screen-gutter pt-12 pb-6">
        <div className="flex gap-3">
          {/* Health Connect status */}
          {hcState.available && (
            <button
              onClick={hcState.authorized ? hcDisconnect : hcConnect}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                hcState.authorized
                  ? "bg-success-dim text-success hover:bg-success/30"
                  : "bg-surface-raised text-text-secondary hover:bg-surface"
              }`}
              title={hcState.authorized ? "Health Connect connected" : "Connect Health Data"}
            >
              <Heart className={`w-5 h-5 ${hcState.authorized ? "fill-success" : ""}`} />
            </button>
          )}
          <button onClick={() => navigate("/editor")} className="w-10 h-10 flex items-center justify-center rounded-full bg-ember text-ink transition-colors">
            <Camera className="w-5 h-5 fill-ink" />
          </button>
          <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface transition-colors" title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Sun className="text-text-primary w-5 h-5" /> : <Moon className="text-text-primary w-5 h-5" />}
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
        {/* ── Profile Header ────────────────────────────────────────── */}
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

        {/* ── Stats Summary ─────────────────────────────────────────── */}
        <section className="flex justify-between items-center py-6 hairline-border-y mb-section-v-rhythm">
          <div className="flex flex-col items-center flex-1">
            <span className="text-stat-value text-text-primary mb-1">{allStats.count}</span>
            <span className="text-label text-text-secondary">Activities</span>
          </div>
          <div className="w-[1px] h-10 bg-hairline"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-stat-value text-text-primary mb-1">{showDistance(allStats.distanceKm, distanceUnit)}</span>
            <span className="text-label text-text-secondary">Total Distance</span>
          </div>
          <div className="w-[1px] h-10 bg-hairline"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-stat-value text-text-primary mb-1">{allStats.following}</span>
            <span className="text-label text-text-secondary">Following</span>
          </div>
        </section>

        {/* ── Recent Activity ───────────────────────────────────────── */}
        <section className="mb-section-v-rhythm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-section-header">Recent Activity</h2>
          </div>

          {/* This Week summary */}
          {recentActivities.length > 0 && (
            <div className="bg-surface rounded-lg p-5 mb-4 hairline-border relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-ember opacity-10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h3 className="text-label text-text-secondary mb-1">This Week</h3>
                  <div className="text-metric-md text-text-primary">
                    {showDistance(weekDistance, distanceUnit)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-label text-text-secondary">{weekActivityCount} Activities</span>
                  {stravaStats && (
                    <p className="text-stat-value text-ember">{stravaStats.totalTimeFormatted}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity list from combined sources */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            className="flex flex-col gap-card-stack-gap"
          >
            {recentActivities.length > 0 ? (
              recentActivities.map((item) => (
                <motion.button
                  key={item.id}
                  variants={{
                    hidden: { opacity: 0, x: -12 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
                  }}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    const statData = item.toStatData();
                    navigate("/editor", {
                      state: {
                        title: statData.title,
                        distance: `${statData.distance} ${statData.distanceUnit}`,
                        pace: `${statData.pace} ${paceSuffix(distanceUnit)}`,
                        time: statData.time,
                      },
                    });
                  }}
                  className="bg-surface rounded-lg p-4 flex items-center hairline-border hover:bg-surface-raised transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-sm bg-ember-dim flex items-center justify-center shrink-0 mr-4">
                    {item.iconType === "target" ? (
                      <Target className="text-ember w-6 h-6" />
                    ) : item.iconType === "flame" ? (
                      <Flame className="text-ember w-6 h-6" />
                    ) : item.iconType === "mountain" ? (
                      <Mountain className="text-ember w-6 h-6" />
                    ) : (
                      <Activity className="text-ember w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-stat-value truncate">{item.title}</h4>
                      <SourceBadge sourceId={item.sourceId} />
                    </div>
                    <p className="text-label text-text-secondary truncate">
                      {item.displayDistance} {item.displayDistanceUnit} • {item.displayPace} • {item.displayTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-tool-caption text-text-secondary">{item.displayTimeAgo}</span>
                    <ChevronRight className="text-text-secondary w-5 h-5" />
                  </div>
                </motion.button>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-text-secondary text-label"
              >
                {loading ? "Loading activities…" : "No activities yet"}
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* ── Units ─────────────────────────────────────────────────── */}
        <section className="mb-section-v-rhythm">
          <h2 className="text-section-header mb-6">Units</h2>
          <div className="bg-surface hairline-border rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary">Distance</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Defaults to your Strava preference. Applies to activities, stats, and exports.
              </p>
            </div>
            <div
              className="shrink-0 flex items-center rounded-full bg-surface-raised p-1"
              role="group"
              aria-label="Distance unit"
            >
              {(["km", "mi"] as const).map((unit) => {
                const isActive = distanceUnit === unit;
                return (
                  <button
                    key={unit}
                    onClick={() => setDistanceUnit(unit)}
                    aria-pressed={isActive}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-colors min-w-[52px] ${
                      isActive
                        ? "bg-ember text-ink"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {unit}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Per-Source Highlights ─────────────────────────────────── */}
        <section className="mb-section-v-rhythm">
          <h2 className="text-section-header mb-6">Connected Sources</h2>
          <div className="flex flex-col gap-3">
            {getEnabledSources().map((def) => {
              const state = sourceStates[def.id];
              const stats = state?.stats;
              const activityCount = state?.activities.length ?? 0;

              if (!state?.connected && def.id !== "strava") return null; // skip if not connected
              if (def.id === "strava" && !state?.connected && activityCount === 0) return null;

              return (
                <div
                  key={def.id}
                  className="bg-surface rounded-lg p-4 hairline-border flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: def.color + "20" }}
                    >
                      {def.id === "strava" ? (
                        <Activity className="w-5 h-5" style={{ color: def.color }} />
                      ) : (
                        <Heart className="w-5 h-5" style={{ color: def.color }} />
                      )}
                    </div>
                    <div>
                      <p className="text-stat-value">{def.label}</p>
                      <p className="text-label text-text-secondary">
                        {state?.connected
                          ? `Connected • ${activityCount} activities`
                          : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {stats && (
                    <div className="text-right">
                      <p className="text-stat-value text-ember">
                        {showDistance(stats.totalDistanceKm, distanceUnit)}
                      </p>
                      <p className="text-tool-caption text-text-secondary">Total</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Health Metrics ────────────────────────────────────────── */}
        {healthDaily && (
          <section className="mb-section-v-rhythm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-section-header">Health Metrics</h2>
              {hcState.available && !hcState.authorized && (
                <button onClick={hcConnect} className="text-label text-ember hover:opacity-80 transition-opacity">
                  Connect Health Data
                </button>
              )}
            </div>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              className="bg-surface rounded-lg p-6 hairline-border grid grid-cols-4 gap-4"
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
                className="flex flex-col items-center text-center"
              >
                <Footprints className="text-success w-6 h-6 mb-3" />
                <span className="text-stat-value mb-1">{healthDaily.steps.toLocaleString()}</span>
                <span className="text-tool-caption text-text-secondary">Steps</span>
              </motion.div>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
                className="flex flex-col items-center text-center"
              >
                <Heart className="text-ember w-6 h-6 mb-3" />
                <span className="text-stat-value mb-1">
                  {healthDaily.heartRate.resting > 0 ? healthDaily.heartRate.resting : "--"}
                </span>
                <span className="text-tool-caption text-text-secondary">Resting HR</span>
              </motion.div>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
                className="flex flex-col items-center text-center"
              >
                <Moon className="text-ice w-6 h-6 mb-3" />
                <span className="text-stat-value mb-1">
                  {healthDaily.sleepHours > 0 ? `${healthDaily.sleepHours}h` : "--"}
                </span>
                <span className="text-tool-caption text-text-secondary">Sleep</span>
              </motion.div>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
                className="flex flex-col items-center text-center"
              >
                <Flame className="text-ember w-6 h-6 mb-3" />
                <span className="text-stat-value mb-1">{healthDaily.caloriesBurned.toLocaleString()}</span>
                <span className="text-tool-caption text-text-secondary">Calories</span>
              </motion.div>
            </motion.div>
          </section>
        )}
      </main>

      {/* ── Bottom Nav ─────────────────────────────────────────────── */}
      <BottomNav active="profile" />
    </motion.div>
  );
}
