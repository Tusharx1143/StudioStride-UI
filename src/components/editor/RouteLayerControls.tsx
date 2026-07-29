/**
 * Styling panel for the route layer: colour, thickness, opacity.
 *
 * Lives outside EditorScreen to keep that file from growing further; the
 * palette is passed in so both share one source of colours.
 */

import { Trash2, X } from "lucide-react";
import type { RouteOverlay } from "../../types";

interface RouteLayerControlsProps {
  overlay: RouteOverlay;
  palette: { hex: string; name: string }[];
  onChange: (next: Partial<RouteOverlay>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const WIDTHS = [
  { value: 2, label: "Thin" },
  { value: 3, label: "Medium" },
  { value: 5, label: "Thick" },
  { value: 8, label: "Bold" },
];

export default function RouteLayerControls({
  overlay,
  palette,
  onChange,
  onDelete,
  onClose,
}: RouteLayerControlsProps) {
  return (
    <div className="absolute bottom-28 left-4 right-4 z-30 rounded-3xl bg-black/70 backdrop-blur-xl border border-white/15 p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-black uppercase tracking-wider text-white/90">
          Route
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-full bg-white/10 text-white/70 hover:text-red-400 flex items-center justify-center border border-white/10 active:scale-95 transition-colors"
            aria-label="Remove route"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 text-white/70 hover:text-white flex items-center justify-center border border-white/10 active:scale-95 transition-colors"
            aria-label="Close route controls"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Colour */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
        {palette.map((c) => {
          const isSelected = overlay.color.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              onClick={() => onChange({ color: c.hex })}
              title={c.name}
              aria-label={c.name}
              aria-pressed={isSelected}
              className={`w-7 h-7 rounded-full shrink-0 border-2 transition-all active:scale-90 ${
                isSelected ? "border-white scale-110" : "border-white/25"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          );
        })}
      </div>

      {/* Thickness */}
      <div className="flex items-center gap-2 mb-3">
        {WIDTHS.map((w) => (
          <button
            key={w.value}
            onClick={() => onChange({ strokeWidth: w.value })}
            aria-pressed={overlay.strokeWidth === w.value}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition-colors active:scale-95 ${
              overlay.strokeWidth === w.value
                ? "bg-ember text-ink border-ember"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* Opacity */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/60 w-14">
          Opacity
        </span>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(overlay.opacity * 100)}
          onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
          className="flex-1 accent-ember"
          aria-label="Route opacity"
        />
        <span className="text-[10px] font-mono text-white/70 w-9 text-right">
          {Math.round(overlay.opacity * 100)}%
        </span>
      </div>
    </div>
  );
}
