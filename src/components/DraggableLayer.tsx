import { motion, useMotionValue } from "motion/react";
import type { PanInfo } from "motion/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { computeSnap, type SnapLine } from "../utils/snapping";
import { SNAP_TARGET_ATTR, collectSnapLines, localRect } from "../utils/snapTargets";

/** How close an edge must come, in px, before it snaps. */
const SNAP_THRESHOLD = 8;

interface DraggableLayerProps {
  /** Committed offset from the canvas centre, in px. */
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  zIndex?: number;
  draggable: boolean;
  constraintsRef: RefObject<HTMLDivElement | null>;
  onDragStart?: () => void;
  /** Receives the new committed offset once a drag settles. */
  onCommit: (next: { x: number; y: number }) => void;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  className?: string;
  /** Reports the alignment lines this drag is currently snapped to. */
  onGuidesChange?: (guides: SnapLine[]) => void;
  onSnap?: () => void;
  children: ReactNode;
}

/**
 * Wraps a canvas element so its position is state-controlled rather than owned
 * by the drag gesture. framer stops syncing x/y from props once `drag` takes
 * them over, so undo could not move an element back; the effect below pushes
 * committed values into the motion values whenever they change externally.
 */
export default function DraggableLayer({
  x,
  y,
  rotate = 0,
  scale = 1,
  zIndex,
  draggable,
  constraintsRef,
  onDragStart,
  onCommit,
  onClick,
  onDoubleClick,
  className,
  onGuidesChange,
  onSnap,
  children,
}: DraggableLayerProps) {
  const mx = useMotionValue(x);
  const my = useMotionValue(y);
  const nodeRef = useRef<HTMLDivElement>(null);
  const snapLinesRef = useRef<SnapLine[]>([]);
  const guideCountRef = useRef(0);

  const currentSnap = () => {
    const canvasEl = constraintsRef.current;
    if (!canvasEl || !nodeRef.current) return { dx: 0, dy: 0, guides: [] as SnapLine[] };
    const rect = localRect(nodeRef.current, canvasEl.getBoundingClientRect());
    return computeSnap(rect, snapLinesRef.current, SNAP_THRESHOLD);
  };

  useEffect(() => {
    mx.set(x);
  }, [x, mx]);

  useEffect(() => {
    my.set(y);
  }, [y, my]);

  return (
    <motion.div
      ref={nodeRef}
      {...{ [SNAP_TARGET_ATTR]: "" }}
      drag={draggable}
      dragConstraints={constraintsRef}
      dragElastic={0.05}
      dragMomentum={false}
      onDragStart={() => {
        snapLinesRef.current = collectSnapLines(constraintsRef.current, nodeRef.current);
        onDragStart?.();
      }}
      onDrag={() => {
        const { guides } = currentSnap();
        // Haptic only on the transition into a snap, not every frame.
        if (guides.length > guideCountRef.current) onSnap?.();
        guideCountRef.current = guides.length;
        onGuidesChange?.(guides);
      }}
      onDragEnd={(_: unknown, info: PanInfo) => {
        const snap = currentSnap();
        guideCountRef.current = 0;
        onGuidesChange?.([]);
        onCommit({
          x: x + info.offset.x + snap.dx,
          y: y + info.offset.y + snap.dy,
        });
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{ x: mx, y: my, rotate, scale, zIndex }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
