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
import BottomNav from "./BottomNav";
import { useContent } from "../contexts/ContentContext";
import { SavedProject } from "../types";
import { formatDistance, formatRelativeTime } from "../utils/projectDoc";
import { deleteProject, listProjects } from "../utils/projectStore";

export default function ProjectsScreen() {
  const navigate = useNavigate();
  const { templateFamilies } = useContent();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Projects live in IndexedDB, so the first paint has nothing to show yet.
  // A failed read resolves to an empty list rather than throwing, which lands
  // the user on the empty state instead of a blank screen.
  useEffect(() => {
    let cancelled = false;

    listProjects().then((saved) => {
      if (cancelled) return;
      setProjects(saved);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2000);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const previous = projects;
    setProjects(projects.filter((p) => p.id !== id));

    const ok = await deleteProject(id);
    if (ok) {
      showToast("Project deleted");
    } else {
      // The row is still on disk, so put it back rather than lying about it.
      setProjects(previous);
      showToast("Could not delete project");
    }
  };

  /**
   * Only the id travels. The editor loads the document itself, so a multi-MB
   * doc never rides through router state and a page reload still resolves it.
   */
  const handleOpenProject = (project: SavedProject) => {
    navigate("/editor", { state: { projectId: project.id } });
  };

  const handleCreateNewProject = () => {
    navigate("/editor");
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
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i} className="bg-surface rounded-2xl hairline-border overflow-hidden">
                <div className="h-44 w-full bg-surface-raised animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-surface-raised animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-surface-raised animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 space-y-4 hairline-border rounded-2xl p-8 bg-surface">
            <div className="w-16 h-16 bg-ember-dim rounded-full flex items-center justify-center mx-auto text-ember">
              <FolderKanban className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-stat-value font-bold text-text-primary">No saved projects yet</h3>
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
              const family =
                templateFamilies.find((f) => f.id === project.doc.templateId) ??
                templateFamilies[0];
              const { statData } = project.doc;

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
                  {/* Thumbnail Banner — a small JPEG rendered at save time, not
                      the full-resolution export the document used to be. */}
                  <div className="relative h-44 w-full bg-cover bg-center overflow-hidden bg-surface-raised" style={{ backgroundImage: `url("${project.thumbnail}")` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/40"></div>

                    {/* Template Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 bg-black/60 text-white backdrop-blur-md">
                        <span>{family.icon}</span>
                        <span>{family.name}</span>
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
                        <span className="text-2xl font-black text-white tracking-tight">{formatDistance(statData)}</span>
                        <div className="text-[11px] text-text-secondary">{statData.pace} • {statData.time}</div>
                      </div>
                      <span className="w-8 h-8 rounded-full bg-ember text-ink flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-ink ml-0.5" />
                      </span>
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-stat-value text-text-primary font-bold group-hover:text-ember transition-colors">
                        {project.title}
                      </h4>
                      <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Updated {formatRelativeTime(project.updatedAt)}
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

      <BottomNav active="projects" />
    </div>
  );
}
