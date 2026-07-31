import { useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface RailTool {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface ToolRailProps {
  tools: RailTool[];
  onToolClick: (toolId: string) => void;
  /** Whether a tool should render in its lit-up state. */
  isToolActive: (toolId: string) => boolean;
  /** Badge count shown on the layers tool; hidden at zero. */
  layerCount: number;
}

/**
 * The editing tools, stacked down the right edge. Collapses to a single puck so
 * the canvas can be seen unobstructed — collapsing never closes whichever tool
 * panel is open, it only hides the buttons.
 */
export default function ToolRail({
  tools,
  onToolClick,
  isToolActive,
  layerCount,
}: ToolRailProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isCollapsed ? (
        <motion.button
          key="rail-puck"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          onClick={() => setIsCollapsed(false)}
          className="absolute right-4 top-28 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-colors shadow-lg"
          aria-label="Show tools"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
      ) : (
        <motion.div
          key="rail"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="absolute right-4 top-28 bottom-44 z-20 flex flex-col items-center gap-3.5 overflow-y-auto no-scrollbar"
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = isToolActive(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => onToolClick(tool.id)}
                className="flex flex-col items-center gap-1 group relative transition-all duration-200 active:scale-90 shrink-0"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg relative ${
                    isActive
                      ? "bg-ember text-ink border-2 border-ember shadow-[0_0_20px_var(--color-ember-glow)] scale-105"
                      : "bg-black/60 text-white border border-white/20 hover:bg-black/80"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tool.id === "layers" && layerCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ember text-ink text-[9px] font-black flex items-center justify-center border border-black shadow">
                      {layerCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-white/90 drop-shadow-md">
                  {tool.label}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setIsCollapsed(true)}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/60 hover:text-white active:scale-90 transition-colors shrink-0 mt-0.5"
            aria-label="Hide tools"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
