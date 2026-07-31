import { motion, useMotionValue } from "motion/react";
import type { CSSProperties, RefObject } from "react";
import { useRef } from "react";
import type {
  SlotPosition,
  SlotStyle,
  StatData,
  StatSlotId,
  TemplateLayout,
} from "../types";
import { getStatDesign } from "../data/templateStatDesigns";
import { useContent } from "../contexts/ContentContext";
import { metricForSlot, resolveSlotStyle } from "../utils/metricSlots";
import { commitDrag } from "../utils/statLayouts";
import { computeSnap, type SnapLine } from "../utils/snapping";
import { SNAP_TARGET_ATTR, collectSnapLines, localRect } from "../utils/snapTargets";

const CORE_SLOT_LABELS: Record<string, string> = {
  distance: "Distance",
  pace: "Pace",
  time: "Time",
  title: "Activity title",
};

/** Spoken name for a slot, so a screen reader announces more than "button". */
function slotLabel(slot: StatSlotId, data: StatData): string {
  const metric = metricForSlot(slot, data);
  if (metric) return metric.label;
  return CORE_SLOT_LABELS[slot] ?? slot;
}

/** How close an edge must come, in px, before it snaps. */
const SNAP_THRESHOLD = 8;

/** Slot sizes are authored against this width and scale with the canvas. */
const REFERENCE_WIDTH = 390;

interface StatLayerProps {
  templateId: string;
  data: StatData;
  layout: TemplateLayout;
  onLayoutChange: (next: TemplateLayout) => void;
  constraintsRef: RefObject<HTMLElement | null>;
  /** False renders the stats fixed in place. */
  interactive?: boolean;
  selectedSlot?: StatSlotId | null;
  onSelectSlot?: (slot: StatSlotId | null) => void;
  onDragStart?: () => void;
  /** Reports the alignment lines a drag is currently snapped to. */
  onGuidesChange?: (guides: SnapLine[]) => void;
  onSnap?: () => void;
}

export default function StatLayer({
  templateId,
  data,
  layout,
  onLayoutChange,
  constraintsRef,
  interactive = true,
  selectedSlot = null,
  onSelectSlot,
  onDragStart,
  onGuidesChange,
  onSnap,
}: StatLayerProps) {
  const { statDesigns } = useContent();
  // Published design wins; the hardcoded table covers anything unconfigured.
  const design = statDesigns[templateId] ?? getStatDesign(templateId);
  const slots = Object.keys(layout) as StatSlotId[];

  return (
    // container-type makes the cqw font sizes resolve against the canvas width,
    // so one set of numbers works on a phone viewfinder and a 1080px export.
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ containerType: "inline-size" }}
    >
      {slots.map((slot) => {
        const pos = layout[slot];
        if (!pos) return null;

        if (slot === "accent") {
          if (!design.accentRender) return null;
          return (
            <StatChip
              key={slot}
              slot={slot}
              label="Accent decoration"
              pos={pos}
              layout={layout}
              onLayoutChange={onLayoutChange}
              constraintsRef={constraintsRef}
              interactive={interactive}
              isSelected={selectedSlot === slot}
              onSelectSlot={onSelectSlot}
              onDragStart={onDragStart}
              onGuidesChange={onGuidesChange}
              onSnap={onSnap}
            >
              {design.accentRender(data)}
            </StatChip>
          );
        }

        // Shared with drawStatLayer: a metric slot borrows the template's own
        // secondary-stat styling, and resolves to null when this activity does
        // not carry that metric — so no blank chip is ever rendered.
        const style = resolveSlotStyle(design, slot, data);
        if (!style) return null;

        return (
          <StatChip
            key={slot}
            slot={slot}
            label={slotLabel(slot, data)}
            pos={pos}
            layout={layout}
            onLayoutChange={onLayoutChange}
            constraintsRef={constraintsRef}
            interactive={interactive}
            isSelected={selectedSlot === slot}
            onSelectSlot={onSelectSlot}
            onDragStart={onDragStart}
            onGuidesChange={onGuidesChange}
            onSnap={onSnap}
          >
            <SlotText style={style} data={data} />
          </StatChip>
        );
      })}
    </div>
  );
}

interface StatChipProps {
  slot: StatSlotId;
  pos: SlotPosition;
  layout: TemplateLayout;
  onLayoutChange: (next: TemplateLayout) => void;
  constraintsRef: RefObject<HTMLElement | null>;
  interactive: boolean;
  isSelected: boolean;
  onSelectSlot?: (slot: StatSlotId | null) => void;
  onDragStart?: () => void;
  onGuidesChange?: (guides: SnapLine[]) => void;
  onSnap?: () => void;
  /** Spoken name for the chip, e.g. "Distance". */
  label: string;
  children: React.ReactNode;
}

function StatChip({
  slot,
  pos,
  layout,
  onLayoutChange,
  constraintsRef,
  interactive,
  isSelected,
  onSelectSlot,
  onDragStart,
  onGuidesChange,
  onSnap,
  label,
  children,
}: StatChipProps) {
  const chipRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const snapLinesRef = useRef<SnapLine[]>([]);
  const guideCountRef = useRef(0);

  /** Snap offset for the chip's live position, in px. */
  const currentSnap = () => {
    const canvasEl = constraintsRef.current as HTMLElement | null;
    if (!canvasEl || !chipRef.current) return { dx: 0, dy: 0, guides: [] as SnapLine[] };
    const rect = localRect(chipRef.current, canvasEl.getBoundingClientRect());
    return computeSnap(rect, snapLinesRef.current, SNAP_THRESHOLD);
  };

  return (
    <motion.div
      ref={chipRef}
      {...{ [SNAP_TARGET_ATTR]: "" }}
      drag={interactive}
      dragConstraints={constraintsRef}
      dragElastic={0.05}
      dragMomentum={false}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, x, y }}
      onDragStart={() => {
        snapLinesRef.current = collectSnapLines(
          constraintsRef.current as HTMLElement | null,
          chipRef.current
        );
        onDragStart?.();
      }}
      onDrag={() => {
        const { guides } = currentSnap();
        // Haptic only on the transition into a snap, not every frame.
        if (guides.length > guideCountRef.current) onSnap?.();
        guideCountRef.current = guides.length;
        onGuidesChange?.(guides);
      }}
      onDragEnd={(_, info) => {
        const canvas = constraintsRef.current?.getBoundingClientRect();
        const chip = chipRef.current?.getBoundingClientRect();
        if (!canvas || !chip) return;

        const snap = currentSnap();
        guideCountRef.current = 0;
        onGuidesChange?.([]);

        const next = commitDrag({
          pos,
          offset: { x: info.offset.x + snap.dx, y: info.offset.y + snap.dy },
          canvas: { width: canvas.width, height: canvas.height },
          chip: { width: chip.width, height: chip.height },
        });

        // left/top now carry the position, so the transform resets to zero
        // without the chip appearing to jump.
        x.set(0);
        y.set(0);
        onLayoutChange({ ...layout, [slot]: next });
      }}
      onClick={(e) => {
        // Keep drag-release off the viewfinder's double-tap handler.
        e.stopPropagation();
        onSelectSlot?.(slot);
      }}
      // Positioning was drag-only, which left the editor unusable without a
      // touchscreen or a mouse. Arrows nudge by 1% of the canvas, Shift by 10%.
      tabIndex={interactive ? 0 : -1}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? `${label}. Use arrow keys to move.` : undefined}
      onKeyDown={(e) => {
        if (!interactive) return;

        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;

        switch (e.key) {
          case "ArrowLeft": dx = -step; break;
          case "ArrowRight": dx = step; break;
          case "ArrowUp": dy = -step; break;
          case "ArrowDown": dy = step; break;
          case "Enter":
          case " ":
            e.preventDefault();
            onSelectSlot?.(slot);
            return;
          default:
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        onSelectSlot?.(slot);
        onLayoutChange({
          ...layout,
          [slot]: {
            x: Math.max(0, Math.min(100, pos.x + dx)),
            y: Math.max(0, Math.min(100, pos.y + dy)),
          },
        });
      }}
      className={`absolute touch-none select-none origin-top-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-selection focus-visible:outline-offset-4 rounded-lg ${
        interactive ? "pointer-events-auto cursor-grab active:cursor-grabbing" : "pointer-events-none"
      } ${isSelected ? "outline outline-2 outline-selection outline-offset-4" : ""}`}
    >
      {children}
    </motion.div>
  );
}

/** Reference-width px expressed in container-query units, so every dimension
 *  scales with the canvas exactly as the exporter's `scale` factor does. */
function cqw(px: number): string {
  return `${(px / REFERENCE_WIDTH) * 100}cqw`;
}

function SlotText({ style, data }: { style: SlotStyle; data: StatData }) {
  const text = style.text(data);
  const suffix = style.suffix?.(data);

  const css: CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: cqw(style.fontSize),
    fontWeight: style.fontWeight,
    color: style.color,
    fontStyle: style.italic ? "italic" : "normal",
    textTransform: style.uppercase ? "uppercase" : "none",
    // Reference px, same unit the exporter scales — not an em of some fixed base.
    letterSpacing: style.letterSpacing ? cqw(style.letterSpacing) : undefined,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    transform: style.rotation ? `rotate(${style.rotation}deg)` : undefined,
  };

  if (style.shadow) {
    const { color, blur, x = 0, y = 0 } = style.shadow;
    css.textShadow = `${cqw(x)} ${cqw(y)} ${cqw(blur)} ${color}`;
  }

  if (style.bg) {
    css.backgroundColor = style.bg.fill;
    css.borderRadius = cqw(style.bg.radius);
    css.padding = `${cqw(style.bg.padY)} ${cqw(style.bg.padX)}`;
    if (style.bg.border) {
      css.border = `1px solid ${style.bg.border}`;
    }
    if (style.bg.blur) {
      css.backdropFilter = "blur(12px)";
    }
    if (style.shadow) {
      const { color, blur, x = 0, y = 0 } = style.shadow;
      css.boxShadow = `${cqw(x)} ${cqw(y)} ${cqw(blur)} ${color}`;
      delete css.textShadow;
    }
  }

  return (
    <div style={css}>
      {text}
      {suffix ? (
        <span
          style={{
            fontSize: `${(style.suffixScale ?? 0.5) * 100}%`,
            color: style.suffixColor ?? style.color,
            marginLeft: "0.25em",
          }}
        >
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
