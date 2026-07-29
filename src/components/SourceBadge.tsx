/**
 * Small source-identity badge rendered on each activity card.
 * Shows the source name + brand color dot.
 */

import type { ActivitySourceId } from "../sources/types";
import { getEnabledSources } from "../sources/registry";

interface SourceBadgeProps {
  sourceId: ActivitySourceId;
}

export default function SourceBadge({ sourceId }: SourceBadgeProps) {
  const def = getEnabledSources().find((s) => s.id === sourceId);

  if (!def) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: def.color + "20",
        color: def.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: def.color }}
      />
      {def.label}
    </span>
  );
}
