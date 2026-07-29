/**
 * Reusable confirmation modal.
 *
 * Uses the app's glass-morphism overlay pattern with blur backdrop.
 */

import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmColor =
    variant === "danger"
      ? "bg-danger hover:bg-danger/90"
      : variant === "warning"
        ? "bg-amber-500 hover:bg-amber-600"
        : "bg-ember hover:brightness-110";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-sm glass-strong rounded-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${variant === "danger" ? "bg-danger/10" : "bg-amber-500/10"}`}>
                  <AlertTriangle className={`w-5 h-5 ${variant === "danger" ? "text-danger" : "text-amber-500"}`} />
                </div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
              </div>
              <button
                onClick={onCancel}
                className="p-1 rounded-lg hover:bg-surface-overlay transition-colors"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            {/* Message */}
            <p className="text-sm text-white/60 leading-relaxed">{message}</p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl bg-surface-overlay text-white/80 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-colors ${confirmColor}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
