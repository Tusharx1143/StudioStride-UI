import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity, Target, ChevronRight, User, Home, Plus, Camera, FolderKanban,
  Flame, Mountain, Heart, Footprints, Moon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHealthConnect } from "../contexts/HealthConnectContext";
import { useActivitySources } from "../contexts/ActivitySourcesContext";
import SourceBadge from "./SourceBadge";
import ActivityFilterBar from "./ActivityFilterBar";
import type { UnifiedActivity } from "../sources/types";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const navigate = useNavigate();
  const { athlete } = useAuth();
  const { state: hcState, daily: healthDaily, connect: hcConnect } = useHealthConnect();
  const {
    filteredActivities,
    loading,
    activeSourceFilter,
    setSourceFilter,
    activeTypeFilter,
    setTypeFilter,
    availableTypes,
  } = useActivitySources();

  // ── Derive display data ───────────────────────────────────────────────

  const activeActivity = filteredActivities[0] ?? null;
  const previousActivities = filteredActivities.slice(1);

  const greeting = athlete?.firstname
    ? `${athlete.firstname}'s Stride`
    : "STRIDE";

  // ── Navigate to camera ────────────────────────────────────────────────

  const openCamera = (activity: UnifiedActivity) => {
    const statData = activity.toStatData();
    navigate("/camera", {
      state: {
        title: statData.title,
        distance: `${statData.distance} ${statData.distanceUnit}`,
        pace: `${statData.pace} /km`,
        time: statData.time,
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
              openCamera(activeActivity);
            } else {
              navigate("/camera", {
                state: {
                  title: "Ready to Move",
                  distance: "0 km",
                  pace: "--:-- /km",
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
              onClick={() => openCamera(activeActivity)}
            >
              <div className="absolute inset-0 bg-ember opacity-20 blur-2xl rounded-2xl group-hover:opacity-30 transition-opacity"></div>

              <div className="bg-surface relative z-10 rounded-xl p-5 hairline-border shadow-[0_0_40px_rgba(255,122,26,0.12)]">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-sm bg-ember flex items-center justify-center shrink-0">
                    {getBigIcon(activeActivity.iconType)}
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

                <div className="mt-6 pt-4 hairline-border-t flex items-center justify-between text-ember">
                  <span className="text-stat-value flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Create Story
                  </span>
                  <ChevronRight className="w-5 h-5" />
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
            <p className="text-body text-text-secondary">
              Connect a data source to see your activities here.
            </p>
          </section>
        )}

        {/* ── Health Today ──────────────────────────────────────────── */}
        {healthDaily && (
          <section className="mb-section-v-rhythm">
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

            <div className="bg-surface rounded-lg p-4 hairline-border grid grid-cols-4 gap-3">
              <div className="flex flex-col items-center text-center gap-1">
                <Footprints className="text-ember w-5 h-5" />
                <span className="text-stat-value text-text-primary">
                  {healthDaily.steps.toLocaleString()}
                </span>
                <span className="text-tool-caption text-text-secondary">Steps</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <Activity className="text-ember w-5 h-5" />
                <span className="text-stat-value text-text-primary">
                  {healthDaily.distanceKm.toFixed(1)}
                </span>
                <span className="text-tool-caption text-text-secondary">Km</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <Heart className="text-ember w-5 h-5" />
                <span className="text-stat-value text-text-primary">
                  {healthDaily.heartRate.avg > 0 ? healthDaily.heartRate.avg : "--"}
                </span>
                <span className="text-tool-caption text-text-secondary">Avg HR</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <Moon className="text-ember w-5 h-5" />
                <span className="text-stat-value text-text-primary">
                  {healthDaily.sleepHours > 0 ? `${healthDaily.sleepHours}h` : "--"}
                </span>
                <span className="text-tool-caption text-text-secondary">Sleep</span>
              </div>
            </div>
          </section>
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

            <div className="flex flex-col gap-card-stack-gap">
              <AnimatePresence>
                {previousActivities.map((item) => (
                  <motion.button
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => openCamera(item)}
                    className="bg-surface rounded-lg p-4 flex items-center hairline-border hover:bg-surface-raised active:scale-[0.99] transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-sm bg-ember-dim flex items-center justify-center shrink-0 mr-4 group-hover:bg-ember/20 transition-colors">
                      {getIcon(item.iconType)}
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
            </div>
          </section>
        )}
      </main>

      {/* ── Bottom Nav ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 w-full z-50 rounded-t-xl hairline-border-t bg-surface flex justify-around items-center px-4 py-3 pb-safe" aria-label="Main navigation">
        <button
          className="flex flex-col items-center justify-center bg-surface-raised text-ember rounded-full p-3 transition-colors"
          aria-label="Home"
          aria-current="page"
        >
          <Home className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate("/camera")}
          className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-ember transition-colors"
          aria-label="Camera"
        >
          <Camera className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate("/projects")}
          className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-ember transition-colors"
          aria-label="Projects"
        >
          <FolderKanban className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate("/profile")}
          className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-text-primary transition-colors"
          aria-label="Profile"
        >
          <User className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
