import { motion, useMotionValue } from "motion/react";
import type { PanInfo } from "motion/react";
import { useEffect, type ReactNode, type RefObject } from "react";

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
  children,
}: DraggableLayerProps) {
  const mx = useMotionValue(x);
  const my = useMotionValue(y);

  useEffect(() => {
    mx.set(x);
  }, [x, mx]);

  useEffect(() => {
    my.set(y);
  }, [y, my]);

  return (
    <motion.div
      drag={draggable}
      dragConstraints={constraintsRef}
      dragElastic={0.05}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={(_: unknown, info: PanInfo) => {
        onCommit({ x: x + info.offset.x, y: y + info.offset.y });
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
