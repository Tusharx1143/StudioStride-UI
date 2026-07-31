import { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, X } from "lucide-react";
import { useContent } from "../../contexts/ContentContext";

interface BackgroundSheetProps {
  isOpen: boolean;
  /** Receives either a data URL from the device or a stock photo URL. */
  onSelect: (url: string) => void;
  onClose: () => void;
}

/**
 * The single entry point for every background source that isn't the camera:
 * a device file picker and the stock photo library.
 */
export default function BackgroundSheet({ isOpen, onSelect, onClose }: BackgroundSheetProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Stock library is Content Manager territory.
  const { stockPhotos } = useContent();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      if (imageUrl) onSelect(imageUrl);
    };
    reader.readAsDataURL(file);
    // Allow re-picking the same file next time the sheet opens.
    e.target.value = "";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Choose Background"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="glass-surface rounded-t-3xl p-screen-gutter space-y-4 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div>
                <h3 className="text-section-header">Background</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Import a photo or pick one from the library
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white active:scale-[0.98] transition-all"
            >
              <Upload className="w-4 h-4 text-ember" />
              <span>Import from device</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div>
              <h4 className="text-xs font-bold text-text-secondary mb-2 px-0.5">
                Stock photos
              </h4>
              <div className="grid grid-cols-3 gap-2 pb-2">
                {stockPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => onSelect(photo.url)}
                    className="relative h-28 rounded-xl overflow-hidden hairline-border group active:scale-95 transition-transform"
                    title={photo.name}
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
