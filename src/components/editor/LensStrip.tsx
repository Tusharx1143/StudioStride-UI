import { motion } from "motion/react";
import type { TemplateFamily } from "../../types";
import { triggerHaptic } from "../../utils/haptics";

interface LensStripProps {
  templates: TemplateFamily[];
  selectedId: string;
  onSelect: (template: TemplateFamily) => void;
}

/**
 * The template-family carousel — the editor's "lenses". Circles read the same
 * as any camera lens picker: a conic active ring, an abstract thumbnail built
 * from the family's accent colour, and a label that never hides.
 */
export default function LensStrip({ templates, selectedId, onSelect }: LensStripProps) {
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
        {templates.map((tmpl) => {
          const isActive = tmpl.id === selectedId;
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
              className="flex flex-col items-center gap-1 shrink-0 relative w-[64px]"
              aria-label={`${tmpl.name} template`}
              aria-pressed={isActive}
            >
              <div className="relative">
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
