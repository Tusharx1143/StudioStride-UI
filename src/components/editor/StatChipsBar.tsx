import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Layers, RefreshCw, Sliders, X } from "lucide-react";
import type { CoreSlotId, StatData, StatSlotId } from "../../types";
import { triggerHaptic } from "../../utils/haptics";
import { metricSlot, metricsByCategory } from "../../utils/metricSlots";

const SLOT_LABELS: Record<CoreSlotId, string> = {
  distance: "Distance",
  pace: "Pace",
  time: "Time",
  title: "Activity Title",
  accent: "Accent Decoration",
};

const SLOT_INITIALS: Record<CoreSlotId, string> = {
  distance: "D",
  pace: "P",
  time: "T",
  title: "A",
  accent: "✦",
};

const ALL_SLOTS: CoreSlotId[] = ["distance", "pace", "time", "title", "accent"];

interface StatChipsBarProps {
  hiddenSlots: Set<StatSlotId>;
  onToggleSlot: (slot: StatSlotId) => void;
  isGrouped: boolean;
  onToggleGroup: () => void;
  /** Whether the active template has a user-dragged layout worth resetting. */
  isCustomized: boolean;
  onReset: () => void;
  /** The activity, which decides which metrics can be offered at all. */
  statData: StatData;
  /** Metric slots currently placed on the canvas. */
  placedMetricSlots: StatSlotId[];
  onToggleMetric: (slot: StatSlotId) => void;
}

/**
 * Stat-level controls that sit above the canvas rather than in the tool rail —
 * they act on the template's stats as a set, not on a single layer.
 */
export default function StatChipsBar({
  hiddenSlots,
  onToggleSlot,
  isGrouped,
  onToggleGroup,
  isCustomized,
  onReset,
  statData,
  placedMetricSlots,
  onToggleMetric,
}: StatChipsBarProps) {
  const metricGroups = metricsByCategory(statData);
  const placed = new Set(placedMetricSlots);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-1.5 shrink-0"
      >
        <button
          onClick={() => setIsSelectorOpen(true)}
          className="shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold glass text-white/60 hover:text-white flex items-center gap-1.5 active:scale-90 transition-all"
          aria-label="Toggle stats visibility"
        >
          <Sliders className="w-3 h-3" />
          <span>Stats</span>
        </button>

        <button
          onClick={() => {
            onToggleGroup();
            triggerHaptic("light");
          }}
          className={`shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 active:scale-90 transition-all ${
            isGrouped
              ? "bg-ember/30 text-ember border border-ember/40 shadow-[0_0_12px_rgba(255,122,26,0.2)]"
              : "glass text-white/60 hover:text-white"
          }`}
          aria-label={isGrouped ? "Ungroup stats" : "Group stats"}
          title={isGrouped ? "Stats move together" : "Drag stats individually"}
        >
          <Layers className="w-3 h-3" />
          <span>{isGrouped ? "Grouped" : "Group"}</span>
        </button>

        {isCustomized && (
          <button
            onClick={() => {
              onReset();
              triggerHaptic("light");
            }}
            className="shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold glass text-white/80 hover:text-white flex items-center gap-1.5 active:scale-90 transition-all"
            aria-label="Reset stat layout"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset layout</span>
          </button>
        )}
      </motion.div>

      {/* Portalled to the body: the chips sit inside the top bar's stacking
          context, which would otherwise let the bottom bars paint over this. */}
      {createPortal(
        <AnimatePresence>
          {isSelectorOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
              role="dialog"
              aria-modal="true"
              aria-label="Toggle Stats"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="glass-surface rounded-t-3xl p-screen-gutter space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <h3 className="text-section-header">Toggle Stats</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Show or hide individual stats on your template
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSelectorOpen(false)}
                    className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 pb-2">
                  {ALL_SLOTS.map((slot) => {
                    const isVisible = !hiddenSlots.has(slot);
                    return (
                      <button
                        key={slot}
                        onClick={() => {
                          onToggleSlot(slot);
                          triggerHaptic("light");
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                          isVisible
                            ? "bg-ember-dim border border-ember/30"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${
                              isVisible ? "bg-ember text-ink" : "bg-white/10 text-white/40"
                            }`}
                          >
                            {SLOT_INITIALS[slot]}
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              isVisible ? "text-white" : "text-white/40"
                            }`}
                          >
                            {SLOT_LABELS[slot]}
                          </span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isVisible ? "bg-ember border-ember" : "border-white/20 bg-transparent"
                          }`}
                        >
                          {isVisible && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-ink"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Everything else the activity carries. These were fetched
                    and discarded before the slot system could hold them. */}
                {metricGroups.length > 0 && (
                  <div className="space-y-3 pb-2 max-h-[38vh] overflow-y-auto">
                    <div className="pt-1">
                      <h4 className="text-sm font-extrabold text-white">Add a metric</h4>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Only what this activity recorded
                      </p>
                    </div>

                    {metricGroups.map(({ category, metrics }) => (
                      <div key={category} className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1">
                          {category}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {metrics.map((metric) => {
                            const slot = metricSlot(metric.id);
                            const isPlaced = placed.has(slot);
                            return (
                              <button
                                key={metric.id}
                                onClick={() => {
                                  onToggleMetric(slot);
                                  triggerHaptic("light");
                                }}
                                aria-pressed={isPlaced}
                                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                                  isPlaced
                                    ? "bg-ember text-ink"
                                    : "bg-white/5 border border-white/10 text-white/70 hover:text-white"
                                }`}
                              >
                                <span aria-hidden="true">{metric.icon}</span>
                                <span>{metric.label}</span>
                                <span className={isPlaced ? "text-ink/60" : "text-white/40"}>
                                  {metric.value}
                                  {metric.unit && ` ${metric.unit}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setIsSelectorOpen(false)}
                  className="w-full py-2.5 rounded-full bg-ember text-ink font-extrabold text-sm shadow-md active:scale-95 transition-transform"
                >
                  Done
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
