import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, animate, PanInfo } from "motion/react";
import { triggerHaptic } from "../utils/haptics";

interface GestureSwipeCarouselProps<T> {
  items: T[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  itemGap?: number; // Gap between items in px
  selectedScale?: number; // Scale for selected item (e.g., 1.15 for lenses, 1.05 for pills)
  unselectedOpacity?: number; // Opacity for unselected items (e.g., 0.5)
  className?: string;
  itemClassName?: string;
}

// Memoized carousel item to prevent re-renders when only selection state changes
const CarouselItem = React.memo(function CarouselItem({
  item,
  index,
  isSelected,
  itemGap,
  isLast,
  selectedScale,
  unselectedOpacity,
  itemClassName,
  renderItem,
  onSelect,
  onRef,
  isDraggingRef,
}: {
  item: any;
  index: number;
  isSelected: boolean;
  itemGap: number;
  isLast: boolean;
  selectedScale: number;
  unselectedOpacity: number;
  itemClassName: string;
  renderItem: (item: any, index: number, isSelected: boolean) => React.ReactNode;
  onSelect: (index: number) => void;
  onRef: (el: HTMLDivElement | null) => void;
  isDraggingRef: React.RefObject<boolean>;
}) {
  return (
    <div
      ref={onRef}
      onClick={() => {
        if (!isDraggingRef.current) {
          triggerHaptic("selection");
          onSelect(index);
        }
      }}
      style={{
        marginRight: isLast ? "0px" : `${itemGap}px`,
      }}
      className={`shrink-0 transition-all duration-300 ${itemClassName}`}
    >
      <motion.div
        animate={{
          scale: isSelected ? selectedScale : 0.92,
          opacity: isSelected ? 1 : unselectedOpacity,
        }}
        transition={{
          type: "spring",
          stiffness: 350,
          damping: 25,
        }}
      >
        {renderItem(item, index, isSelected)}
      </motion.div>
    </div>
  );
});

export default function GestureSwipeCarousel<T>({
  items,
  selectedIndex,
  onSelectIndex,
  renderItem,
  itemGap = 12,
  selectedScale = 1.12,
  unselectedOpacity = 0.5,
  className = "",
  itemClassName = "",
}: GestureSwipeCarouselProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const x = useMotionValue(0);

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Keep itemRefs array size in sync
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  // Measure container width
  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    updateContainerWidth();
    window.addEventListener("resize", updateContainerWidth);
    return () => window.removeEventListener("resize", updateContainerWidth);
  }, [updateContainerWidth]);

  // Calculate target X position to center item at `index`
  const getTargetX = useCallback(
    (index: number): number => {
      if (!containerRef.current || index < 0 || index >= items.length) return 0;
      const targetEl = itemRefs.current[index];
      if (!targetEl) return 0;

      const cWidth = containerRef.current.offsetWidth || containerWidth || 360;
      const itemLeft = targetEl.offsetLeft;
      const itemWidth = targetEl.offsetWidth;
      const itemCenter = itemLeft + itemWidth / 2;

      return cWidth / 2 - itemCenter;
    },
    [containerWidth, items.length]
  );

  // Smoothly animate x to center the selected item whenever selectedIndex or containerWidth changes
  useEffect(() => {
    if (items.length === 0 || !containerRef.current) return;

    // Small timeout to allow DOM layout to finalize
    const timer = setTimeout(() => {
      const targetX = getTargetX(selectedIndex);
      animate(x, targetX, {
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 0.8,
      });
    }, 10);

    return () => clearTimeout(timer);
  }, [selectedIndex, containerWidth, items.length, getTargetX, x]);

  // Handle Drag End (Finger release or flick gesture)
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    isDraggingRef.current = false;

    if (!containerRef.current || items.length === 0) return;

    const currentX = x.get();
    const velocityX = info.velocity.x; // Velocity in px/s
    const cWidth = containerRef.current.offsetWidth;

    // Project end position based on flick velocity (momentum scrolling)
    const projectedX = currentX + velocityX * 0.16;

    // Find closest item to projected center
    let closestIndex = 0;
    let minDistance = Infinity;

    items.forEach((_, i) => {
      const el = itemRefs.current[i];
      if (el) {
        const itemCenter = el.offsetLeft + el.offsetWidth / 2;
        // Position of item center on screen at projectedX
        const screenCenterPos = itemCenter + projectedX;
        const distance = Math.abs(cWidth / 2 - screenCenterPos);

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
    });

    // Clamp index
    const newIndex = Math.max(0, Math.min(items.length - 1, closestIndex));

    if (newIndex !== selectedIndex) {
      triggerHaptic("selection");
    }
    onSelectIndex(newIndex);

    // Spring snap to exact target
    const targetX = getTargetX(newIndex);
    animate(x, targetX, {
      type: "spring",
      stiffness: 400,
      damping: 28,
      mass: 0.8,
    });
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none touch-pan-y ${className}`}
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <motion.div
        drag="x"
        dragElastic={0.25}
        onDragStart={() => { isDraggingRef.current = true; }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="flex items-center w-max cursor-grab active:cursor-grabbing py-2"
      >
        {items.map((item, index) => (
          <CarouselItem
            key={index}
            item={item}
            index={index}
            isSelected={index === selectedIndex}
            itemGap={itemGap}
            isLast={index >= items.length - 1}
            selectedScale={selectedScale}
            unselectedOpacity={unselectedOpacity}
            itemClassName={itemClassName}
            renderItem={renderItem}
            onSelect={onSelectIndex}
            onRef={(el) => (itemRefs.current[index] = el)}
            isDraggingRef={isDraggingRef}
          />
        ))}
      </motion.div>
    </div>
  );
}
