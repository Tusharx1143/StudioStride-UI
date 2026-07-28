import { useRef, useEffect, useState, useCallback, useMemo, memo } from "react";
import { motion, useMotionValue, animate, PanInfo } from "motion/react";
import { triggerHaptic } from "../utils/haptics";
import { TemplateFamily } from "../types";

interface TemplateCarouselProps {
  templates: TemplateFamily[];
  selectedId: string;
  onSelect: (template: TemplateFamily) => void;
}

const ITEM_SIZE = 72;
const ITEM_GAP = 16;
const ITEM_STEP = ITEM_SIZE + ITEM_GAP;
const SELECTED_SCALE = 1.15;
const NEIGHBOR_SCALE = 0.9;
const FAR_SCALE = 0.85;
const SELECTED_LIFT = -4;
const MOMENTUM_FACTOR = 0.16;

// ── Memoized Carousel Item ──────────────────────────────────────────
const CarouselItem = memo(function CarouselItem({
  template,
  distance,
  isSelected,
  onSelect,
  isDraggingRef,
}: {
  template: TemplateFamily;
  distance: number;
  isSelected: boolean;
  onSelect: () => void;
  isDraggingRef: React.RefObject<boolean>;
}) {
  const style = useMemo(() => {
    if (isSelected) {
      return {
        scale: SELECTED_SCALE,
        y: SELECTED_LIFT,
        opacity: 1,
        blur: 0,
        ringColor: template.accentColor,
        ringWidth: 3,
      };
    }
    if (distance === 1) {
      return {
        scale: NEIGHBOR_SCALE,
        y: 0,
        opacity: 0.55,
        blur: 2,
        ringColor: "rgba(255,255,255,0.15)",
        ringWidth: 1,
      };
    }
    const fadeOpacity = Math.max(0.2, 0.55 - (distance - 1) * 0.12);
    const fadeBlur = Math.min(4, 2 + (distance - 1) * 0.5);
    return {
      scale: FAR_SCALE,
      y: 0,
      opacity: fadeOpacity,
      blur: fadeBlur,
      ringColor: "transparent",
      ringWidth: 1,
    };
  }, [isSelected, distance, template.accentColor]);

  return (
    <div
      onClick={() => {
        if (!isDraggingRef.current) {
          triggerHaptic("selection");
          onSelect();
        }
      }}
      style={{
        width: ITEM_SIZE,
        marginRight: ITEM_GAP,
        flexShrink: 0,
      }}
      className="flex flex-col items-center gap-1.5 cursor-pointer select-none"
    >
      <motion.div
        animate={{
          scale: style.scale,
          y: style.y,
          opacity: style.opacity,
          filter: `blur(${style.blur}px)`,
        }}
        transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
        style={{
          width: ITEM_SIZE,
          height: ITEM_SIZE,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          backgroundColor: isSelected ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.5)",
          border: `${style.ringWidth}px solid ${style.ringColor}`,
          boxShadow: isSelected
            ? `0 0 24px ${style.ringColor}40, 0 0 48px ${style.ringColor}20`
            : "0 2px 8px rgba(0,0,0,0.3)",
          transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        }}
      >
        {template.icon}
      </motion.div>
      <motion.span
        animate={{
          opacity: isSelected ? 1 : distance === 1 ? 0.6 : 0.3,
          y: style.y,
        }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="text-[11px] font-extrabold tracking-tight text-white whitespace-nowrap"
      >
        {template.name}
      </motion.span>
    </div>
  );
});

// ── Main Carousel ───────────────────────────────────────────────────
export default function TemplateCarousel({
  templates,
  selectedId,
  onSelect,
}: TemplateCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const x = useMotionValue(0);
  const containerWidthRef = useRef<number>(360);
  const [spacerWidth, setSpacerWidth] = useState<number>(144); // triggers re-render for spacers

  const itemCount = templates.length;

  // Tripled items for infinite scroll illusion
  const tripledTemplates = useMemo(
    () => [...templates, ...templates, ...templates],
    [templates]
  );

  // Find the selected data index
  const selectedDataIndex = useMemo(
    () => templates.findIndex((t) => t.id === selectedId),
    [templates, selectedId]
  );

  // Virtual index in the middle copy [N, 2N-1]
  const virtualIndexRef = useRef<number>(
    selectedDataIndex >= 0 ? selectedDataIndex + itemCount : itemCount
  );
  const [virtualIndex, setVirtualIndex] = useState<number>(virtualIndexRef.current);

  // ── Calculate x to center item at a tripled index ────────────────
  const getTargetX = useCallback(
    (tripledIndex: number): number => {
      const cw = containerWidthRef.current;
      const itemCenter = tripledIndex * ITEM_STEP + ITEM_SIZE / 2;
      return cw / 2 - itemCenter;
    },
    []
  );

  // ── Measure container width ─────────────────────────────────────
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        if (w > 0) {
          containerWidthRef.current = w;
          setSpacerWidth(Math.max(0, w / 2 - ITEM_SIZE / 2));
        }
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Initial centering ───────────────────────────────────────────
  useEffect(() => {
    // Wait for layout
    const timer = requestAnimationFrame(() => {
      // Measure if needed
      if (containerRef.current && containerWidthRef.current < 100) {
        containerWidthRef.current = containerRef.current.offsetWidth || 360;
      }
      const idx = virtualIndexRef.current;
      const targetX = getTargetX(idx);
      x.set(targetX);
    });
    return () => cancelAnimationFrame(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync when selectedId changes externally ─────────────────────
  useEffect(() => {
    const target = selectedDataIndex + itemCount;
    if (target !== virtualIndexRef.current) {
      virtualIndexRef.current = target;
      setVirtualIndex(target);
      const targetX = getTargetX(target);
      animate(x, targetX, {
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 0.8,
      });
    }
  }, [selectedDataIndex, itemCount, getTargetX, x]);

  // ── Snap to a tripled index with spring ─────────────────────────
  const snapToIndex = useCallback(
    (tripledIndex: number, silentWrap = true) => {
      const targetX = getTargetX(tripledIndex);
      animate(x, targetX, {
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 0.8,
        onComplete: () => {
          if (!silentWrap) return;
          // Silent wrap to middle copy
          if (tripledIndex < itemCount) {
            const corrected = tripledIndex + itemCount;
            virtualIndexRef.current = corrected;
            setVirtualIndex(corrected);
            x.set(getTargetX(corrected));
          } else if (tripledIndex >= itemCount * 2) {
            const corrected = tripledIndex - itemCount;
            virtualIndexRef.current = corrected;
            setVirtualIndex(corrected);
            x.set(getTargetX(corrected));
          }
        },
      });
    },
    [x, getTargetX, itemCount]
  );

  // ── Drag end handler ────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      isDraggingRef.current = false;

      const currentX = x.get();
      const velocityX = info.velocity.x;
      const projectedX = currentX + velocityX * MOMENTUM_FACTOR;
      const cw = containerWidthRef.current;

      // Find closest tripled item to projected center
      let bestIdx = 0;
      let bestDist = Infinity;

      for (let i = 0; i < tripledTemplates.length; i++) {
        const itemCenter = i * ITEM_STEP + ITEM_SIZE / 2;
        const screenPos = itemCenter + projectedX;
        const dist = Math.abs(cw / 2 - screenPos);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      // Clamp
      const clamped = Math.max(0, Math.min(tripledTemplates.length - 1, bestIdx));
      const dataIndex = clamped % itemCount;
      const prevDataIdx = virtualIndexRef.current % itemCount;

      if (dataIndex !== prevDataIdx) {
        triggerHaptic("selection");
      }

      // Always store in middle copy
      let target = clamped;
      if (target < itemCount) target += itemCount;
      else if (target >= itemCount * 2) target -= itemCount;

      virtualIndexRef.current = target;
      setVirtualIndex(target);
      onSelect(templates[dataIndex]);

      // Snap with spring
      const snapX = getTargetX(target);
      animate(x, snapX, {
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 0.8,
      });
    },
    [x, getTargetX, tripledTemplates.length, itemCount, templates, onSelect]
  );

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="relative w-full py-3">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden select-none"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <motion.div
          drag="x"
          dragElastic={0.2}
          dragMomentum={false}
          onDragStart={() => {
            isDraggingRef.current = true;
          }}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="flex items-center w-max cursor-grab active:cursor-grabbing"
        >
          {/* Lead spacer to allow first item to reach center */}
          <div
            style={{
              width: spacerWidth,
              flexShrink: 0,
            }}
          />

          {tripledTemplates.map((template, tripledIndex) => {
            const distance = Math.abs(tripledIndex - virtualIndex);
            const isSelected = tripledIndex === virtualIndex;
            return (
              <CarouselItem
                key={`${template.id}-${tripledIndex}`}
                template={template}
                distance={distance}
                isSelected={isSelected}
                onSelect={() => {
                  if (isDraggingRef.current) return;
                  const dataIdx = tripledIndex % itemCount;
                  const middleIdx = dataIdx + itemCount;
                  virtualIndexRef.current = middleIdx;
                  setVirtualIndex(middleIdx);
                  onSelect(templates[dataIdx]);
                  snapToIndex(middleIdx, false);
                }}
                isDraggingRef={isDraggingRef}
              />
            );
          })}

          {/* Trailing spacer */}
          <div
            style={{
              width: spacerWidth,
              flexShrink: 0,
            }}
          />
        </motion.div>
      </div>

      {/* Edge fade overlays */}
      <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-ink via-ink/60 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent via-ink/60 to-ink pointer-events-none z-10" />
    </div>
  );
}
