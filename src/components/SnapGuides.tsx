import type { SnapLine } from "../utils/snapping";

interface SnapGuidesProps {
  guides: SnapLine[];
  canvas: { width: number; height: number };
}

/** Thin alignment lines drawn while a dragged element is snapped. */
export default function SnapGuides({ guides, canvas }: SnapGuidesProps) {
  if (!guides.length) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {guides.map((guide) => {
        const pct =
          guide.axis === "x"
            ? (guide.position / canvas.width) * 100
            : (guide.position / canvas.height) * 100;

        return guide.axis === "x" ? (
          <div
            key={`x-${guide.position}`}
            className="absolute top-0 bottom-0 w-px bg-volt/90"
            style={{ left: `${pct}%`, boxShadow: "0 0 6px rgba(244,228,9,0.8)" }}
          />
        ) : (
          <div
            key={`y-${guide.position}`}
            className="absolute left-0 right-0 h-px bg-volt/90"
            style={{ top: `${pct}%`, boxShadow: "0 0 6px rgba(244,228,9,0.8)" }}
          />
        );
      })}
    </div>
  );
}
