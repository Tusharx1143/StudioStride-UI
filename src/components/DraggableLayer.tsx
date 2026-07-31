import { motion, useMotionValue } from "motion/react";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { computeSnap, type SnapLine } from "../utils/snapping";
import { SNAP_TARGET_ATTR, collectSnapLines, localRect } from "../utils/snapTargets";
import { computeGestureTransform, type Point, type Transform } from "../utils/gestureTransform";

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
  /** Receives the new committed transform once every pointer has lifted. */
  onCommit: (next: { x: number; y: number; scale: number; rotation: number }) => void;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  className?: string;
  /** Reports the alignment lines this drag is currently snapped to. */
  onGuidesChange?: (guides: SnapLine[]) => void;
  onSnap?: () => void;
  /**
   * "box" (default) makes the whole wrapper tappable, which suits text and
   * stickers that fill their box. "children" makes the wrapper transparent to
   * hit-testing so only opted-in descendants are targets — needed by the route,
   * whose box is a large mostly-empty square that would otherwise swallow taps
   * meant for the photo. Events from those descendants still bubble here.
   */
  hitArea?: "box" | "children";
  children: ReactNode;
}

/**
 * Wraps a canvas element so it can be moved, pinch-scaled and rotated with
 * multi-touch, and so its position is state-controlled rather than owned by the
 * gesture.
 *
 * Pointer events are handled directly rather than through framer's `drag`:
 * `drag` claims the same events, so the two cannot share a layer. The gesture
 * maths lives in utils/gestureTransform; this component only feeds it pointer
 * positions and pushes results into motion values, so no React render happens
 * per frame.
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
  hitArea = "box",
  children,
}: DraggableLayerProps) {
  const mx = useMotionValue(x);
  const my = useMotionValue(y);
  const mScale = useMotionValue(scale);
  const mRotate = useMotionValue(rotate);

  const nodeRef = useRef<HTMLDivElement>(null);
  const snapLinesRef = useRef<SnapLine[]>([]);
  const guideCountRef = useRef(0);

  /** Live pointers, in the order they landed. */
  const pointersRef = useRef(new Map<number, Point>());
  /** Transform and pointer positions as of the current gesture segment. */
  const baseRef = useRef<Transform>({ x, y, scale, rotation: rotate });
  const startRef = useRef<Point[]>([]);
  const activeRef = useRef(false);

  // framer stops syncing from props once a gesture owns the values, so
  // committed changes (including undo) are pushed back in explicitly.
  useEffect(() => {
    mx.set(x);
  }, [x, mx]);

  useEffect(() => {
    my.set(y);
  }, [y, my]);

  useEffect(() => {
    mScale.set(scale);
  }, [scale, mScale]);

  useEffect(() => {
    mRotate.set(rotate);
  }, [rotate, mRotate]);

  const currentSnap = () => {
    const canvasEl = constraintsRef.current;
    if (!canvasEl || !nodeRef.current) return { dx: 0, dy: 0, guides: [] as SnapLine[] };
    const rect = localRect(nodeRef.current, canvasEl.getBoundingClientRect());
    return computeSnap(rect, snapLinesRef.current, SNAP_THRESHOLD);
  };

  /**
   * Re-snapshot the transform and pointer positions. Called whenever the
   * pointer count changes — without it, lifting one of two fingers turns a
   * two-finger centroid into a one-finger position and the layer jumps.
   */
  const rebaseline = () => {
    baseRef.current = {
      x: mx.get(),
      y: my.get(),
      scale: mScale.get(),
      rotation: mRotate.get(),
    };
    startRef.current = Array.from(pointersRef.current.values(), (p) => ({ ...p }));
  };

  /** Keep the layer's centre inside the canvas so it can never be lost offscreen. */
  const clampToCanvas = (t: Transform): Transform => {
    const el = constraintsRef.current;
    if (!el) return t;
    const halfW = el.clientWidth / 2;
    const halfH = el.clientHeight / 2;
    return {
      ...t,
      x: Math.min(halfW, Math.max(-halfW, t.x)),
      y: Math.min(halfH, Math.max(-halfH, t.y)),
    };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Throws if the pointer is already gone; the gesture still tracks fine.
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (!activeRef.current) {
      activeRef.current = true;
      snapLinesRef.current = collectSnapLines(constraintsRef.current, nodeRef.current);
      onDragStart?.();
    }
    rebaseline();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeRef.current) return;
    if (!pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const current = Array.from(pointersRef.current.values());
    const next = clampToCanvas(
      computeGestureTransform(baseRef.current, startRef.current, current)
    );

    mx.set(next.x);
    my.set(next.y);
    mScale.set(next.scale);
    mRotate.set(next.rotation);

    // Snap only while a single pointer is down — correction fighting a live
    // pinch reads as the layer resisting the gesture.
    if (pointersRef.current.size === 1) {
      const { guides } = currentSnap();
      if (guides.length > guideCountRef.current) onSnap?.();
      guideCountRef.current = guides.length;
      onGuidesChange?.(guides);
    } else if (guideCountRef.current > 0) {
      guideCountRef.current = 0;
      onGuidesChange?.([]);
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.delete(e.pointerId)) return;

    // Fingers remain: start a fresh segment from where things stand.
    if (pointersRef.current.size > 0) {
      rebaseline();
      return;
    }

    activeRef.current = false;
    const snap = currentSnap();
    guideCountRef.current = 0;
    onGuidesChange?.([]);

    onCommit({
      x: mx.get() + snap.dx,
      y: my.get() + snap.dy,
      scale: mScale.get(),
      rotation: mRotate.get(),
    });
  };

  return (
    <motion.div
      ref={nodeRef}
      {...{ [SNAP_TARGET_ATTR]: "" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        x: mx,
        y: my,
        rotate: mRotate,
        scale: mScale,
        zIndex,
        // Without this the browser claims the gesture for scroll and zoom.
        touchAction: "none",
        // The layers carry `transition-all`, which eases transform over 150ms
        // and makes the element lag the finger. Selection chrome still
        // animates; the transform must track the pointer exactly.
        transitionProperty: "border-color, box-shadow, background-color, opacity",
        ...(hitArea === "children" ? { pointerEvents: "none" as const } : {}),
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
