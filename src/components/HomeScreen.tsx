import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Target, ChevronRight, User, Home, Plus, Camera, FolderKanban, Flame, Mountain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchActivities } from "../services/stravaApi";
import { activityToActivityData } from "../services/stravaTransformers";

interface ActivityData {
  id: string;
  title: string;
  subtitle: string;
  distance: string;
  time: string;
  pace: string;
  timeAgo: string;
  type: string;
  iconType: "activity" | "target" | "flame" | "mountain";
}

const INITIAL_ACTIVITIES: ActivityData[] = [
  {
    id: "act_1",
    title: "Morning Run",
    subtitle: "Golden Gate Park",
    distance: "8.4",
    time: "52:18",
    pace: "6:12",
    timeAgo: "2h ago",
    type: "Run",
    iconType: "activity",
  },
  {
    id: "act_2",
    title: "Cycling Sprint",
    subtitle: "Marin Headlands Loop",
    distance: "35.2",
    time: "1:45:32",
    pace: "2:59",
    timeAgo: "Yesterday",
    type: "Cycling",
    iconType: "target",
  },
  {
    id: "act_3",
    title: "Evening Walk",
    subtitle: "Sunset Boulevard",
    distance: "6.1",
    time: "48:12",
    pace: "7:54",
    timeAgo: "2 days ago",
    type: "Walk",
    iconType: "activity",
  },
  {
    id: "act_4",
    title: "Mountain Trail Run",
    subtitle: "Mount Tamalpais",
    distance: "12.8",
    time: "1:18:45",
    pace: "6:08",
    timeAgo: "4 days ago",
    type: "Trail Run",
    iconType: "mountain",
  },
];

export default function HomeScreen() {
  const navigate = useNavigate();
  const { athlete } = useAuth();
  const [activities, setActivities] = useState<ActivityData[]>(INITIAL_ACTIVITIES);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch real activities from Strava on mount
  useEffect(() => {
    fetchActivities({ per_page: 10 })
      .then((stravaActs) => {
        if (stravaActs && stravaActs.length > 0) {
          setActivities(stravaActs.map(activityToActivityData));
        }
      })
      .catch((err) => {
        // Graceful degradation: keep the mock data as fallback
        console.warn("Could not load Strava activities, using mock data:", err);
      })
      .finally(() => setHasLoaded(true));
  }, []);

  // Swap clicked activity with the top (Ready to share) activity
  const handleSwapActivity = (indexToPromote: number) => {
    setActivities((prev) => {
      const updated = [...prev];
      const temp = updated[0];
      updated[0] = updated[indexToPromote];
      updated[indexToPromote] = temp;
      return updated;
    });
  };

  const activeActivity = activities[0];
  const previousActivities = activities.slice(1);

  const getIcon = (type: string) => {
    switch (type) {
      case "target":
        return <Target className="text-ember w-6 h-6" />;
      case "mountain":
        return <Mountain className="text-ember w-6 h-6" />;
      default:
        return <Activity className="text-ember w-6 h-6" />;
    }
  };

  // Greeting derived from athlete name if available
  const greeting = athlete?.firstname
    ? `${athlete.firstname}'s Stride`
    : "STRIDE";

  return (
    <div className="bg-ink text-text-primary min-h-screen pb-24 md:pb-0 font-ui relative">
      <header className="px-screen-gutter pt-12 pb-6 flex justify-between items-center">
        <h1 className="text-wordmark text-[32px] leading-none tracking-tighter">{greeting}</h1>
        <button
          onClick={() =>
            navigate("/camera", {
              state: {
                title: activeActivity.title,
                distance: `${activeActivity.distance} km`,
                pace: `${activeActivity.pace} /km`,
                time: activeActivity.time,
              },
            })
          }
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-raised transition-colors"
          title="Create New Story"
        >
          <Plus className="text-text-primary w-5 h-5" />
        </button>
      </header>

      <main className="px-screen-gutter max-w-2xl mx-auto">
        {/* Featured Activity (Ready to Share) */}
        <section className="mb-section-v-rhythm relative">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-section-header">Ready to share</h2>
          </div>

          <motion.div
            layout
            key={activeActivity.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative group cursor-pointer"
            onClick={() =>
              navigate("/camera", {
                state: {
                  title: activeActivity.title,
                  distance: `${activeActivity.distance} km`,
                  pace: `${activeActivity.pace} /km`,
                  time: activeActivity.time,
                },
              })
            }
          >
            {/* Volt bloom effect */}
            <div className="absolute inset-0 bg-ember opacity-20 blur-2xl rounded-2xl group-hover:opacity-30 transition-opacity"></div>

            <div className="bg-surface relative z-10 rounded-xl p-5 hairline-border shadow-[0_0_40px_rgba(255,122,26,0.12)]">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-sm bg-ember flex items-center justify-center shrink-0">
                  {activeActivity.iconType === "target" ? (
                    <Target className="text-ink w-6 h-6" />
                  ) : activeActivity.iconType === "mountain" ? (
                    <Mountain className="text-ink w-6 h-6" />
                  ) : (
                    <Activity className="text-ink w-6 h-6" />
                  )}
                </div>
                <span className="text-tool-caption text-text-secondary bg-surface-raised px-3 py-1 rounded-full hairline-border">
                  {activeActivity.timeAgo}
                </span>
              </div>

              <div className="mb-4">
                <h3 className="text-screen-title mb-1">{activeActivity.title}</h3>
                <p className="text-body text-text-secondary">{activeActivity.subtitle}</p>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-metric-md">
                    {activeActivity.distance}
                    <span className="text-stat-value text-text-secondary ml-1">km</span>
                  </span>
                </div>
                <div className="w-[1px] bg-hairline"></div>
                <div className="flex flex-col justify-center">
                  <span className="text-stat-value">{activeActivity.time}</span>
                  <span className="text-label text-text-secondary mt-0.5">Time</span>
                </div>
                <div className="w-[1px] bg-hairline"></div>
                <div className="flex flex-col justify-center">
                  <span className="text-stat-value">{activeActivity.pace}</span>
                  <span className="text-label text-text-secondary mt-0.5">Pace</span>
                </div>
              </div>

              <div className="mt-6 pt-4 hairline-border-t flex items-center justify-between text-ember">
                <span className="text-stat-value flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Create Story for {activeActivity.type}
                </span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* Previous Activities */}
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
              {previousActivities.map((item, index) => {
                const actualIndexInArray = index + 1;
                return (
                  <motion.button
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => handleSwapActivity(actualIndexInArray)}
                    className="bg-surface rounded-lg p-4 flex items-center hairline-border hover:bg-surface-raised active:scale-[0.99] transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-sm bg-ember-dim flex items-center justify-center shrink-0 mr-4 group-hover:bg-ember/20 transition-colors">
                      {getIcon(item.iconType)}
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-stat-value mb-1">
                        {item.title}
                      </h4>
                      <p className="text-label text-text-secondary">
                        {item.distance} km • {item.pace} /km • {item.time}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-tool-caption text-text-secondary">{item.timeAgo}</span>
                      <ChevronRight className="text-text-secondary w-5 h-5 group-hover:text-ember transition-colors" />
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
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
