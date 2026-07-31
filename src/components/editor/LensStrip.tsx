import { motion } from "motion/react";
import { Star } from "lucide-react";
import type { TemplateFamily } from "../../types";
import { triggerHaptic } from "../../utils/haptics";

interface LensStripProps {
  templates: TemplateFamily[];
  selectedId: string;
  onSelect: (template: TemplateFamily) => void;
  /** Starred template ids — pinned to the head of the strip. */
  favouriteIds?: string[];
  /** Recently used template ids, most recent first. */
  recentIds?: string[];
  onToggleFavourite?: (templateId: string) => void;
}

/**
 * Favourites first, then recents, then everything else in its authored order.
 *
 * The strip is the most-looked-at control in the editor, and a creator who
 * uses three templates should not scroll past twenty-odd to reach them.
 */
function orderTemplates(
  templates: TemplateFamily[],
  favouriteIds: string[],
  recentIds: string[]
): TemplateFamily[] {
  const rank = (t: TemplateFamily): number => {
    if (favouriteIds.includes(t.id)) return -1000 + favouriteIds.indexOf(t.id);
    const recent = recentIds.indexOf(t.id);
    return recent === -1 ? 0 : -500 + recent;
  };

  return templates
    .map((t, index) => ({ t, index }))
    .sort((a, b) => rank(a.t) - rank(b.t) || a.index - b.index)
    .map(({ t }) => t);
}

/**
 * The template-family carousel — the editor's "lenses". Circles read the same
 * as any camera lens picker: a conic active ring, an abstract thumbnail built
 * from the family's accent colour, and a label that never hides.
 */
export default function LensStrip({
  templates,
  selectedId,
  onSelect,
  favouriteIds = [],
  recentIds = [],
  onToggleFavourite,
}: LensStripProps) {
  const ordered = orderTemplates(templates, favouriteIds, recentIds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
      className="w-full overflow-hidden"
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        className="flex items-start gap-3 px-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {ordered.map((tmpl) => {
          const isActive = tmpl.id === selectedId;
          const isFavourite = favouriteIds.includes(tmpl.id);
          return (
            <motion.button
              key={tmpl.id}
              variants={{
                hidden: { opacity: 0, y: 10, scale: 0.9 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } },
              }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                onSelect(tmpl);
                triggerHaptic("selection");
              }}
              onDoubleClick={(e) => {
                // Double-tap stars a template — LensTemplate.isFavorite was
                // declared in the types and never had a way to be set.
                e.preventDefault();
                e.stopPropagation();
                onToggleFavourite?.(tmpl.id);
              }}
              className="flex flex-col items-center gap-1 shrink-0 relative w-[64px]"
              aria-label={`${tmpl.name} template${isFavourite ? ", favourite" : ""}`}
              aria-pressed={isActive}
              title={`${tmpl.name} — double-tap to ${isFavourite ? "unfavourite" : "favourite"}`}
            >
              <div className="relative">
                {isFavourite && (
                  <span className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-ember flex items-center justify-center shadow-md">
                    <Star className="w-2.5 h-2.5 text-ink fill-ink" />
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="lensActiveRing"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="absolute -inset-[3px] rounded-full"
                    style={{
                      background: `conic-gradient(from 0deg, ${tmpl.accentColor}, rgba(255,255,255,0.4), ${tmpl.accentColor}88, ${tmpl.accentColor})`,
                      boxShadow: `0 0 20px ${tmpl.accentColor}66`,
                    }}
                  />
                )}
                <div
                  className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-200 overflow-hidden ${
                    isActive ? "scale-100 shadow-lg" : "opacity-55 hover:opacity-85"
                  }`}
                  style={{
                    background: isActive
                      ? `radial-gradient(circle at 35% 30%, ${tmpl.accentColor}55, rgba(0,0,0,0.7))`
                      : "rgba(255,255,255,0.08)",
                    boxShadow: isActive
                      ? `inset 0 0 12px ${tmpl.accentColor}33, 0 0 8px rgba(0,0,0,0.4)`
                      : "inset 0 0 4px rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${tmpl.accentColor}44, ${tmpl.accentColor}22 60%, transparent 80%)`,
                    }}
                  />
                  <svg viewBox="0 0 40 40" width="36" height="36" className="relative">
                    <circle cx="12" cy="14" r="3.5" fill={tmpl.accentColor} opacity="0.8" />
                    <circle cx="28" cy="20" r="3" fill={tmpl.accentColor} opacity="0.6" />
                    <rect x="8" y="26" width="14" height="3" rx="1.5" fill={tmpl.accentColor} opacity="0.4" />
                    <rect x="24" y="28" width="10" height="2.5" rx="1.25" fill={tmpl.accentColor} opacity="0.3" />
                  </svg>
                  <span
                    style={{
                      position: "absolute",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: `${tmpl.accentColor}33`,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "-0.05em",
                      bottom: "2px",
                      right: "3px",
                      lineHeight: 1,
                    }}
                  >
                    {tmpl.name.charAt(0)}
                  </span>
                </div>
              </div>
              <span
                className={`text-[9px] font-semibold text-center leading-tight transition-all duration-200 ${
                  isActive
                    ? "text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]"
                    : "text-white/60"
                }`}
                style={{ maxWidth: "64px" }}
              >
                {tmpl.name}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
