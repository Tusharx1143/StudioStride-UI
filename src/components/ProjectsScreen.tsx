import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Clock,
  Sparkles,
  ChevronRight,
  Home,
  Camera,
  User,
  Edit3,
  FolderKanban,
  Check,
  Play
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LENS_TEMPLATES_EXPANDED } from "../data/mockData";
import { SavedProject } from "../types";

const DEFAULT_PROJECTS: SavedProject[] = [
  {
    id: "proj_1",
    title: "Morning Run 👟",
    activityType: "Running",
    date: "Today, 06:42 AM",
    bgImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuDlsjk48o8ErhWrUjPhdzzaP74wJH_nquNbZIH4dR7AIG6LbjLQkqiJaMR284RioPEkOLEw7D3MXmWV3A79eAJcOw_mXQTmHbqtKY7BkoTatCpo3-TuKVmrc5DSldPniGu4j0g0l7scfAKwI-l4WsOrcLq8loKxR7ryH5R--8ouPLRfes4BcES-TNs_-ptBX6nwHeko36PIy4neS96AG15e8Bpld82jqn2ss32hXxYfuqAo6B5P5EhLfBvz6FHQDKuIMklXl5I3oHpE",
    lensId: "minimal",
    elements: [],
    distance: "8.4 km",
    pace: "6:12 /km",
    time: "52:18",
    updatedAt: "10 mins ago",
    placedTextsCount: 2,
  },
  {
    id: "proj_2",
    title: "Golden Gate Trail 🌉",
    activityType: "Trail Run",
    date: "Yesterday, 05:15 PM",
    bgImage: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop",
    lensId: "strava",
    elements: [],
    distance: "12.1 km",
    pace: "5:48 /km",
    time: "1:10:22",
    updatedAt: "1 day ago",
    placedTextsCount: 1,
  },
  {
    id: "proj_3",
    title: "Night City Sprint ⚡",
    activityType: "Speed Session",
    date: "2 days ago",
    bgImage: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1200&auto=format&fit=crop",
    lensId: "cyberpunk",
    elements: [],
    distance: "5.0 km",
    pace: "4:32 /km",
    time: "22:40",
    updatedAt: "2 days ago",
    placedTextsCount: 3,
  },
];

export default function ProjectsScreen() {
  const navigate = useNavigate();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialRender = useRef(true);

  const [projects, setProjects] = useState<SavedProject[]>(() => {
    try {
      const local = localStorage.getItem("stride_projects");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Malformed data — fall through to defaults
    }
    return DEFAULT_PROJECTS;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Skip the initial mount to avoid persisting defaults on first render
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    localStorage.setItem("stride_projects", JSON.stringify(projects));
  }, [projects]);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(projects.filter((p) => p.id !== id));
    setToastMessage("Project deleted");
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2000);
  };

  const handleOpenProject = (project: SavedProject) => {
    navigate("/editor", {
      state: {
        projectId: project.id,
        capturedImage: project.bgImage,
        selectedLensId: project.lensId,
        title: project.title,
        distance: project.distance,
        pace: project.pace,
        time: project.time,
      },
    });
  };

  const handleCreateNewProject = () => {
    navigate("/camera");
  };

  return (
    <div className="bg-ink text-text-primary min-h-screen pb-24 md:pb-0 font-ui relative">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-ember text-ink font-bold px-5 py-2 rounded-full text-xs shadow-2xl flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-screen-gutter pt-12 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-section-header mb-0.5">My Saved Projects</h1>
          <p className="text-xs text-text-secondary">Continue editing your activity stories</p>
        </div>
        <button
          onClick={handleCreateNewProject}
          className="h-10 px-4 rounded-full bg-ember text-ink font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,122,26,0.3)] hover:bg-ember-press"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Project</span>
        </button>
      </header>

      <main className="px-screen-gutter max-w-2xl mx-auto space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-16 space-y-4 hairline-border rounded-2xl p-8 bg-surface">
            <div className="w-16 h-16 bg-ember-dim rounded-full flex items-center justify-center mx-auto text-ember">
              <FolderKanban className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-stat-value font-bold text-white">No saved projects yet</h3>
              <p className="text-xs text-text-secondary max-w-xs mx-auto mt-1">
                Snap or pick a workout photo to customize with lenses, stickers, and stats overlays.
              </p>
            </div>
            <button
              onClick={handleCreateNewProject}
              className="px-6 py-3 bg-ember text-ink font-extrabold text-sm rounded-full inline-flex items-center gap-2 hover:bg-ember-press"
            >
              <Plus className="w-4 h-4" /> Start New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project) => {
              const lens = LENS_TEMPLATES_EXPANDED.find((l) => l.id === project.lensId) || LENS_TEMPLATES_EXPANDED[0];

              return (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenProject(project)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleOpenProject(project); } }}
                  role="button"
                  tabIndex={0}
                  className="bg-surface rounded-2xl hairline-border overflow-hidden hover:border-ember/50 transition-colors cursor-pointer group flex flex-col justify-between relative shadow-lg"
                >
                  {/* Thumbnail Banner */}
                  <div className="relative h-44 w-full bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url("${project.bgImage}")` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/40"></div>

                    {/* Lens Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 ${lens.badgeColor}`}>
                        <span>{lens.icon}</span>
                        <span>{lens.name}</span>
                      </span>
                    </div>

                    {/* Delete Project Button */}
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-text-secondary hover:text-rose-400 backdrop-blur-md flex items-center justify-center transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Stats Overlay Preview */}
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <div>
                        <span className="text-2xl font-black text-white tracking-tight">{project.distance}</span>
                        <div className="text-[11px] text-text-secondary">{project.pace} • {project.time}</div>
                      </div>
                      <span className="w-8 h-8 rounded-full bg-ember text-ink flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-ink ml-0.5" />
                      </span>
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-stat-value text-white font-bold group-hover:text-ember transition-colors">
                        {project.title}
                      </h4>
                      <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Updated {project.updatedAt}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-ember transition-colors" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Navigation */}
      <motion.nav
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
        className="fixed bottom-0 w-full z-50 rounded-t-xl hairline-border-t bg-surface flex justify-around items-center px-4 py-3 pb-safe"
        aria-label="Main navigation"
      >
        <button onClick={() => navigate("/home")} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-text-primary transition-colors" aria-label="Home">
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => navigate("/camera")} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-ember transition-colors" aria-label="Camera">
          <Camera className="w-6 h-6" />
        </button>
        <button onClick={() => navigate("/projects")} className="flex flex-col items-center justify-center bg-surface-raised text-ember rounded-full p-3 transition-colors" aria-label="Projects" aria-current="page">
          <FolderKanban className="w-6 h-6" />
        </button>
        <button onClick={() => navigate("/profile")} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-text-primary transition-colors" aria-label="Profile">
          <User className="w-6 h-6" />
        </button>
      </motion.nav>
    </div>
  );
}
