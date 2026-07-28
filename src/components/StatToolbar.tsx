import { motion } from "motion/react";
import { X } from "lucide-react";
import type { StatSlotId, TemplateFamily } from "../types";
import TemplateCarousel from "./TemplateCarousel";
import { placeStrip } from "../utils/statStrip";

/** Strip height as a percentage of the canvas, matched to its rendered size. */
const STRIP_HEIGHT_PCT = 15;
const STRIP_GAP_PCT = 2;
const STRIP_BOUNDS = { min: 2, max: 98 };

/** Slot height is only needed to flip the strip; a rough figure is enough. */
const APPROX_SLOT_HEIGHT_PCT = 8;

interface StatToolbarProps {
  templates: TemplateFamily[];
  selectedTemplateId: string;
  onSelectTemplate: (template: TemplateFamily) => void;
  /** Selected slot's top edge as a percentage of the canvas. */
  slotY: number;
  selectedSlot: StatSlotId;
  onClose: () => void;
}

export default function StatToolbar({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  slotY,
  selectedSlot,
  onClose,
}: StatToolbarProps) {
  const { top } = placeStrip({
    slotY,
    slotHeight: APPROX_SLOT_HEIGHT_PCT,
    stripHeight: STRIP_HEIGHT_PCT,
    gap: STRIP_GAP_PCT,
    bounds: STRIP_BOUNDS,
  });

  const activeName =
    templates.find((t) => t.id === selectedTemplateId)?.name ?? "Template";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.stopPropagation()}
      style={{ top: `${top}%` }}
      // right-20 keeps the strip clear of the vertical tool rail.
      className="absolute left-3 right-20 z-40 bg-black/92 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
    >
      {/* Header. Further sections (per-stat styling) slot in below the carousel. */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-volt shrink-0">
            {selectedSlot}
          </span>
          <span className="text-[11px] text-white/40 truncate">{activeName}</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/10 text-white/70 hover:text-white flex items-center justify-center border border-white/10 active:scale-95 transition-colors shrink-0"
          aria-label="Close stat toolbar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <TemplateCarousel
        templates={templates}
        selectedId={selectedTemplateId}
        onSelect={onSelectTemplate}
      />
    </motion.div>
  );
}
