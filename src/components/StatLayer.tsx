import { motion, useMotionValue } from "motion/react";
import type { CSSProperties, RefObject } from "react";
import { useRef } from "react";
import type {
  SlotPosition,
  SlotStyle,
  StatData,
  StatSlotId,
  TemplateLayout,
  TextSlotId,
} from "../types";
import { getStatDesign } from "../data/templateStatDesigns";
import { commitDrag } from "../utils/statLayouts";

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
}: StatLayerProps) {
  const design = getStatDesign(templateId);
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
              pos={pos}
              layout={layout}
              onLayoutChange={onLayoutChange}
              constraintsRef={constraintsRef}
              interactive={interactive}
              isSelected={selectedSlot === slot}
              onSelectSlot={onSelectSlot}
              onDragStart={onDragStart}
            >
              {design.accentRender(data)}
            </StatChip>
          );
        }

        const style = design.slots[slot as TextSlotId];
        if (!style) return null;

        return (
          <StatChip
            key={slot}
            slot={slot}
            pos={pos}
            layout={layout}
            onLayoutChange={onLayoutChange}
            constraintsRef={constraintsRef}
            interactive={interactive}
            isSelected={selectedSlot === slot}
            onSelectSlot={onSelectSlot}
            onDragStart={onDragStart}
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
  children,
}: StatChipProps) {
  const chipRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  return (
    <motion.div
      ref={chipRef}
      drag={interactive}
      dragConstraints={constraintsRef}
      dragElastic={0.05}
      dragMomentum={false}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, x, y }}
      onDragStart={onDragStart}
      onDragEnd={(_, info) => {
        const canvas = constraintsRef.current?.getBoundingClientRect();
        const chip = chipRef.current?.getBoundingClientRect();
        if (!canvas || !chip) return;

        const next = commitDrag({
          pos,
          offset: info.offset,
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
      className={`absolute touch-none select-none origin-top-left ${
        interactive ? "pointer-events-auto cursor-grab active:cursor-grabbing" : "pointer-events-none"
      } ${isSelected ? "outline outline-2 outline-blue-500 outline-offset-4 rounded-lg" : ""}`}
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
