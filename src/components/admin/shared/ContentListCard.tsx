/**
 * Shared card component for admin content-type list views.
 *
 * Renders a row/card with the item name, a small preview, and action buttons.
 */

import { Edit2, EyeOff, Trash2 } from "lucide-react";

interface ContentListCardProps {
  title: string;
  subtitle?: string;
  isActive: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  /** Optional preview element rendered on the left. */
  preview?: React.ReactNode;
}

export default function ContentListCard({
  title,
  subtitle,
  isActive,
  onEdit,
  onToggleActive,
  onDelete,
  preview,
}: ContentListCardProps) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl bg-surface-raised border transition-colors ${
        isActive ? "hairline-border" : "border-white/5 opacity-60"
      }`}
    >
      {/* Preview */}
      {preview && (
        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-surface">
          {preview}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-white/40 truncate mt-0.5">{subtitle}</p>
        )}
        <span
          className={`inline-block mt-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
            isActive
              ? "bg-success/10 text-success"
              : "bg-white/5 text-white/30"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-surface-overlay text-white/50 hover:text-white transition-colors"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleActive}
          className="p-2 rounded-lg hover:bg-surface-overlay text-white/50 hover:text-amber-400 transition-colors"
          title={isActive ? "Deactivate" : "Activate"}
        >
          <EyeOff className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-surface-overlay text-white/50 hover:text-danger transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
