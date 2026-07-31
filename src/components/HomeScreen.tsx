import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity, Target, ChevronRight, User, Home, Plus, Camera, FolderKanban,
  Flame, Mountain, Heart, Footprints, Moon, RefreshCw, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useAuth } from "../contexts/AuthContext";
import { useHealthConnect } from "../contexts/HealthConnectContext";
import { useActivitySources } from "../contexts/ActivitySourcesContext";
import SourceBadge from "./SourceBadge";
import ActivityFilterBar from "./ActivityFilterBar";
import type { UnifiedActivity } from "../sources/types";
import { RouteThumbnail } from "./RouteThumbnail";
import { partitionActivities } from "../utils/featuredActivity";
import {
  buildRecap,
  recapSummary,
  recapTitle,
  recapToStatData,
  type Recap,
} from "../utils/recap";
import { paceSuffix } from "../utils/units";
import { useDistanceUnit } from "../utils/unitPreference";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const navigate = useNavigate();
  const distanceUnit = useDistanceUnit();
  const { athlete } = useAuth();
  const { state: hcState, daily: healthDaily, connect: hcConnect } = useHealthConnect();
  const {
    filteredActivities,
    loadMore,
    hasMore,
    isLoadingMore,
    loading,
    refreshAll,
    activeSourceFilter,
    setSourceFilter,
    activeTypeFilter,
    setTypeFilter,
    availableTypes,
  } = useActivitySources();

  // ── Derive display data ───────────────────────────────────────────────

  // Which activity the user has promoted into "Ready to share". Null means
  // the default (newest); an id that a filter removes falls back to it.
  const [featuredId, setFeaturedId] = useState<string | null>(null);

  const { featured: activeActivity, previous: previousActivities } = partitionActivities(
    filteredActivities,
    featuredId
  );

  /**
   * Promote a previous activity. The featured card lives above the list, so
   * scroll it into view — otherwise tapping a row further down changes
   * something the user cannot see and reads as nothing having happened.
   */
  const featureActivity = (activity: UnifiedActivity) => {
    setFeaturedId(activity.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Aggregated from the same combined feed the list already uses.
  const weekRecap = buildRecap(filteredActivities, "week");
  const monthRecap = buildRecap(filteredActivities, "month");

  /** Opens a recap in the editor as ordinary stats — no parallel pipeline. */
  const openRecap = (recap: Recap) => {
    const statData = recapToStatData(recap, distanceUnit);
    navigate("/editor", {
      state: {
        title: statData.title,
        distance: `${statData.distance} ${statData.distanceUnit}`,
        pace: `${statData.pace} ${paceSuffix(distanceUnit)}`,
        time: statData.time,
        metrics: statData.metrics,
        // The longest run's shape stands in for the period.
        route: recap.longest?.route ?? recap.withRoutes[0]?.route,
      },
    });
  };

  const greeting = athlete?.firstname
    ? `${athlete.firstname}'s Stride`
    : "STRIDE";

  // ── Straight to the editor with this activity's stats ─────────────────

  const openEditor = (activity: UnifiedActivity) => {
    const statData = activity.toStatData();
    navigate("/editor", {
      state: {
        title: statData.title,
        distance: `${statData.distance} ${statData.distanceUnit}`,
        pace: `${statData.pace} ${paceSuffix(distanceUnit)}`,
        time: statData.time,
        // Everything else the activity recorded — heart rate, elevation,
        // watts, kudos. Without this the metric picker has nothing to offer.
        metrics: statData.metrics,
        // Absent for treadmill runs, gym sessions, and Health Connect
        // activities — the editor hides the Route tool when it's missing.
        route: activity.route,
      },
    });
  };

  // ── Icon helper ───────────────────────────────────────────────────────

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "target":
        return <Target className="text-ember w-6 h-6" />;
      case "mountain":
        return <Mountain className="text-ember w-6 h-6" />;
      case "flame":
        return <Flame className="text-ember w-6 h-6" />;
      default:
        return <Activity className="text-ember w-6 h-6" />;
    }
  };

  const getBigIcon = (iconType: string) => {
    switch (iconType) {
      case "target":
        return <Target className="text-ink w-6 h-6" />;
      case "mountain":
        return <Mountain className="text-ink w-6 h-6" />;
      case "flame":
        return <Flame className="text-ink w-6 h-6" />;
      default:
        return <Activity className="text-ink w-6 h-6" />;
    }
  };

  return (
    <div className="bg-ink text-text-primary min-h-screen pb-24 md:pb-0 font-ui relative">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="px-screen-gutter pt-12 pb-6 flex justify-between items-center">
        <h1 className="text-wordmark text-[32px] leading-none tracking-tighter">{greeting}</h1>
        <button
          onClick={() => {
            if (activeActivity) {
              openEditor(activeActivity);
            } else {
              navigate("/editor", {
                state: {
                  title: "Ready to Move",
                  distance: `0 ${distanceUnit}`,
                  pace: `--:-- ${paceSuffix(distanceUnit)}`,
                  time: "0:00",
                },
              });
            }
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-raised transition-colors"
          title="Create New Story"
        >
          <Plus className="text-text-primary w-5 h-5" />
        </button>
      </header>

      <main className="px-screen-gutter max-w-2xl mx-auto">
        {/* ── Featured Activity ─────────────────────────────────────── */}
        {activeActivity ? (
          <section className="mb-section-v-rhythm relative">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-section-header">Ready to share</h2>
              <SourceBadge sourceId={activeActivity.sourceId} />
            </div>

            <motion.div
              layout
              key={activeActivity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative group cursor-pointer"
              onClick={() => openEditor(activeActivity)}
            >
              <div className="absolute inset-0 bg-ember opacity-20 blur-2xl rounded-2xl group-hover:opacity-30 transition-opacity"></div>

              <div className="bg-surface relative z-10 rounded-xl p-5 hairline-border shadow-[0_0_40px_rgba(255,122,26,0.12)]">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-sm bg-ember flex items-center justify-center shrink-0">
                    {activeActivity.route ? (
                      // Ink on ember: the badge is solid orange.
                      <RouteThumbnail
                        geometry={activeActivity.route}
                        size={40}
                        strokeWidth={2}
                        color="var(--color-ink, #101014)"
                      />
                    ) : (
                      getBigIcon(activeActivity.iconType)
                    )}
                  </div>
                  <span className="text-tool-caption text-text-secondary bg-surface-raised px-3 py-1 rounded-full hairline-border">
                    {activeActivity.displayTimeAgo}
                  </span>
                </div>

                <div className="mb-4">
                  <h3 className="text-screen-title mb-1">{activeActivity.title}</h3>
                  <p className="text-body text-text-secondary">{activeActivity.subtitle}</p>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-metric-md">
                      {activeActivity.displayDistance}
                      <span className="text-stat-value text-text-secondary ml-1">
                        {activeActivity.displayDistanceUnit}
                      </span>
                    </span>
                  </div>
                  <div className="w-[1px] bg-hairline"></div>
                  <div className="flex flex-col justify-center">
                    <span className="text-stat-value">{activeActivity.displayTime}</span>
                    <span className="text-label text-text-secondary mt-0.5">Time</span>
                  </div>
                  <div className="w-[1px] bg-hairline"></div>
                  <div className="flex flex-col justify-center">
                    <span className="text-stat-value">{activeActivity.displayPace}</span>
                    <span className="text-label text-text-secondary mt-0.5">Pace</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 hairline-border-t flex items-center justify-between gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditor(activeActivity); }}
                    className="flex items-center gap-1.5 text-ember hover:opacity-80 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-stat-value">Create Story</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </section>
        ) : (
          /* Empty state when no activities */
          <section className="mb-section-v-rhythm text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-raised flex items-center justify-center mb-4">
              <Activity className="text-text-secondary w-8 h-8" />
            </div>
            <h2 className="text-section-header mb-2">No activities yet</h2>
            <p className="text-body text-text-secondary mb-6">
              {loading ? "Syncing your data…" : "Pull your latest activities from connected sources."}
            </p>
            {!loading && (
              <button
                onClick={refreshAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface hover:bg-surface-raised text-text-primary text-label font-semibold hairline-border active:scale-[0.97] transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sync Now</span>
              </button>
            )}
            {loading && (
              <div className="flex items-center justify-center gap-2 text-text-secondary text-label">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Refreshing…</span>
              </div>
            )}
          </section>
        )}

        {/* ── Health Today ──────────────────────────────────────────── */}
        {healthDaily && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-section-v-rhythm"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-section-header">Health Today</h2>
              {hcState.available && !hcState.authorized && (
                <button
                  onClick={hcConnect}
                  className="text-xs text-ember hover:opacity-80 transition-opacity font-semibold"
                >
                  Connect
                </button>
              )}
            </div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.08 } },
              }}
              className="bg-surface rounded-lg p-4 hairline-border grid grid-cols-4 gap-3"
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
                }}
                className="flex flex-col items-center text-center gap-1"
              >
                <Footprints className="text-success w-5 h-5" />
                <span className="text-stat-value text-text-primary">
                  {healthDaily.steps.toLocaleString()}
                </span>
                <span className="text-tool-caption text-text-secondary">Steps</span>
              </motion.div>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
                }}
                className="flex flex-col items-center text-center gap-1"
              >
                <Activity className="text-ember w-5 h-5" />
                <span className="text-stat-value text-text-primary">
                  {healthDaily.distanceKm.toFixed(1)}
                </span>
                <span className="text-tool-caption text-text-secondary">Km</span>
              </motion.div>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
                }}
                className="flex flex-col items-center text-center gap-1"
              >
                <Heart className="text-ember w-5 h-5" />
                <span className="text-stat-value text-text-primary">
                  {healthDaily.heartRate.avg > 0 ? healthDaily.heartRate.avg : "--"}
                </span>
                <span className="text-tool-caption text-text-secondary">Avg HR</span>
              </motion.div>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
                }}
                className="flex flex-col items-center text-center gap-1"
              >
                <Moon className="text-ice w-5 h-5" />
                <span className="text-stat-value text-text-primary">
                  {healthDaily.sleepHours > 0 ? `${healthDaily.sleepHours}h` : "--"}
                </span>
                <span className="text-tool-caption text-text-secondary">Sleep</span>
              </motion.div>
            </motion.div>
          </motion.section>
        )}

        {/* ── Filter Bar ────────────────────────────────────────────── */}
        {previousActivities.length > 0 && (
          <ActivityFilterBar
            activeSource={activeSourceFilter}
            onSourceChange={setSourceFilter}
            activeType={activeTypeFilter}
            onTypeChange={setTypeFilter}
            availableTypes={availableTypes}
          />
        )}

        {/* ── In Review ─────────────────────────────────────────────────
            Every stat in the app is single-activity. Recaps get shared on a
            predictable cadence, which is the retention loop a story editor
            wants — and they compose through the ordinary editor pipeline. */}
        {(weekRecap.activityCount > 0 || monthRecap.activityCount > 0) && (
          <section className="mb-section-v-rhythm">
            <h2 className="text-section-header mb-4">In review</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[weekRecap, monthRecap]
                .filter((r) => r.activityCount > 0)
                .map((recap) => (
                  <button
                    key={recap.period}
                    onClick={() => openRecap(recap)}
                    className="bg-surface hairline-border rounded-xl p-4 text-left hover:bg-surface-raised hover:border-ember/40 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-stat-value truncate">{recapTitle(recap)}</h3>
                        <p className="text-label text-text-secondary mt-0.5 truncate">
                          {recapSummary(recap, distanceUnit)}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 shrink-0 text-text-secondary group-hover:text-ember transition-colors" />
                    </div>

                    {/* RouteThumbnail makes the route grid almost free. */}
                    {recap.withRoutes.length > 0 && (
                      <div className="flex items-center gap-2 text-ember">
                        {recap.withRoutes.slice(0, 5).map((a) => (
                          <RouteThumbnail key={a.id} geometry={a.route!} size={28} strokeWidth={2} />
                        ))}
                        {recap.withRoutes.length > 5 && (
                          <span className="text-tool-caption text-text-secondary">
                            +{recap.withRoutes.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </section>
        )}

        {/* ── Previous Activities ───────────────────────────────────── */}
        {previousActivities.length > 0 && (
          <section className="mb-section-v-rhythm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-section-header">Previous Activities</h2>
              <button
                onClick={() => navigate("/projects")}
                className="text-xs text-text-secondary hover:text-ember transition-colors flex items-center gap-1"
              >
                Saved Projects <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
              }}
              className="flex flex-col gap-card-stack-gap"
            >
              <AnimatePresence>
                {previousActivities.map((item) => (
                  <motion.button
                    layout
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
                    }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => featureActivity(item)}
                    aria-label={`Feature ${item.title}`}
                    className="bg-surface rounded-lg p-4 flex items-center hairline-border hover:bg-surface-raised transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-sm bg-ember-dim flex items-center justify-center shrink-0 mr-4 group-hover:bg-ember/20 transition-colors text-ember">
                      {item.route ? (
                        // currentColor picks up text-ember against the dim badge.
                        <RouteThumbnail geometry={item.route} size={40} strokeWidth={2} />
                      ) : (
                        getIcon(item.iconType)
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-stat-value truncate">
                          {item.title}
                        </h4>
                        <SourceBadge sourceId={item.sourceId} />
                      </div>
                      <p className="text-label text-text-secondary truncate">
                        {item.displayDistance} {item.displayDistanceUnit} • {item.displayPace} • {item.displayTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-tool-caption text-text-secondary">
                        {item.displayTimeAgo}
                      </span>
                      <ChevronRight className="text-text-secondary w-5 h-5 group-hover:text-ember transition-colors" />
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* The feed used to stop dead at 20 with no way to reach anything
                older, however much history the athlete had. */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="mt-4 w-full py-3 rounded-xl bg-surface hairline-border text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading…</span>
                  </>
                ) : (
                  <span>Load older activities</span>
                )}
              </button>
            )}
          </section>
        )}
      </main>

      {/* ── Bottom Nav ─────────────────────────────────────────────── */}
      <BottomNav active="home" />
    </div>
  );
}
