/**
 * Filter bar for the HomeScreen activity list.
 *
 * Allows filtering by:
 * - Source (Strava / Health Connect / All)
 * - Activity type (Run, Walk, Cycling, etc. / All)
 */

import type { ActivitySourceId } from "../sources/types";
import { getEnabledSources } from "../sources/registry";

interface ActivityFilterBarProps {
  activeSource: ActivitySourceId | "all";
  onSourceChange: (source: ActivitySourceId | "all") => void;
  activeType: string | "all";
  onTypeChange: (type: string | "all") => void;
  availableTypes: string[];
}

export default function ActivityFilterBar({
  activeSource,
  onSourceChange,
  activeType,
  onTypeChange,
  availableTypes,
}: ActivityFilterBarProps) {
  const sources = getEnabledSources();

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Source filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => onSourceChange("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            activeSource === "all"
              ? "bg-ember text-ink"
              : "bg-surface-raised text-text-secondary hover:text-text-primary"
          }`}
        >
          All
        </button>
        {sources.map((source) => (
          <button
            key={source.id}
            onClick={() => onSourceChange(source.id as ActivitySourceId)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeSource === source.id
                ? "text-white"
                : "bg-surface-raised text-text-secondary hover:text-text-primary"
            }`}
            style={
              activeSource === source.id
                ? { backgroundColor: source.color }
                : undefined
            }
          >
            {source.label}
          </button>
        ))}
      </div>

      {/* Activity type filter chips */}
      {availableTypes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onTypeChange("all")}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              activeType === "all"
                ? "bg-ember/20 text-ember"
                : "bg-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            All Types
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeType === type
                  ? "bg-ember/20 text-ember"
                  : "bg-surface text-text-secondary hover:text-text-primary"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
