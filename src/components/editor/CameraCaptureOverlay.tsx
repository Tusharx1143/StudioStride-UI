import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImageIcon, RefreshCw, Timer as TimerIcon, X, Zap, ZapOff } from "lucide-react";

interface CameraCaptureOverlayProps {
  isOpen: boolean;
  /** Receives a JPEG data URL of the captured frame. */
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  /** Escape hatch when the device has no usable camera. */
  onFallbackToGallery: () => void;
}

const TIMER_STEPS = [0, 3, 10] as const;
type TimerSeconds = (typeof TIMER_STEPS)[number];

/**
 * Live viewfinder layered over the editor canvas. The media stream is acquired
 * when the overlay opens and every track is stopped when it closes, so the
 * editor never holds the camera open in the background.
 */
export default function CameraCaptureOverlay({
  isOpen,
  onCapture,
  onClose,
  onFallbackToGallery,
}: CameraCaptureOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<TimerSeconds>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Stream lifecycle — re-acquired when the facing mode flips.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let acquired: MediaStream | null = null;

    (async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        acquired = mediaStream;
        streamRef.current = mediaStream;
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
        setCameraActive(true);
        setCameraError(null);
      } catch (err) {
        if (cancelled) return;
        console.warn("Camera access unavailable:", err);
        setCameraError("Live camera preview inactive on this device.");
        setCameraActive(false);
      }
    })();

    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
    };
  }, [isOpen, facingMode]);

  // Any pending countdown dies with the overlay.
  useEffect(() => {
    if (isOpen) return;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    setCountdown(null);
    setIsCapturing(false);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const executeCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraActive) return;

    setIsCapturing(true);

    // A tick lets the flash blink paint before the frame is grabbed.
    setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;
      const ctx = canvas.getContext("2d");

      setIsCapturing(false);
      if (!ctx) return;

      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 0.7 quality keeps the data URL near 300KB so it survives sessionStorage.
      onCapture(canvas.toDataURL("image/jpeg", 0.7));
    }, 250);
  }, [cameraActive, facingMode, onCapture]);

  const triggerCapture = () => {
    if (!cameraActive || isCapturing || countdown !== null) return;

    if (timerSeconds === 0) {
      executeCapture();
      return;
    }

    setCountdown(timerSeconds);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          executeCapture();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cycleTimer = () => {
    setTimerSeconds((prev) => {
      const idx = TIMER_STEPS.indexOf(prev);
      return TIMER_STEPS[(idx + 1) % TIMER_STEPS.length];
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Camera"
        >
          {/* Flash blink */}
          {flashEnabled && isCapturing && (
            <div className="absolute inset-0 bg-white z-40 opacity-90 pointer-events-none" />
          )}

          {/* Countdown */}
          <AnimatePresence>
            {countdown !== null && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none"
              >
                <span className="text-9xl font-black text-ember drop-shadow-[0_0_40px_rgba(255,122,26,0.9)]">
                  {countdown}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Viewfinder */}
          <div className="relative flex-1 overflow-hidden">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-white/40" />
                </div>
                <p className="text-sm text-white/70 max-w-xs">
                  {cameraError ?? "Starting camera…"}
                </p>
                {cameraError && (
                  <button
                    onClick={onFallbackToGallery}
                    className="px-5 py-2.5 rounded-full bg-ember text-ink font-extrabold text-sm active:scale-95 transition-transform"
                  >
                    Choose a photo instead
                  </button>
                )}
              </div>
            )}

            {/* Top controls */}
            <div className="relative z-30 flex items-center justify-between p-4 pt-12">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
                aria-label="Close camera"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={cycleTimer}
                  className={`h-10 px-3 rounded-full backdrop-blur-md border flex items-center gap-1.5 text-xs font-bold active:scale-90 transition-all ${
                    timerSeconds > 0
                      ? "bg-ember text-ink border-ember"
                      : "bg-black/50 text-white/80 border-white/20"
                  }`}
                  aria-label={`Self timer ${timerSeconds} seconds`}
                >
                  <TimerIcon className="w-4 h-4" />
                  <span>{timerSeconds === 0 ? "Off" : `${timerSeconds}s`}</span>
                </button>

                <button
                  onClick={() => setFlashEnabled((prev) => !prev)}
                  className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center active:scale-90 transition-all ${
                    flashEnabled
                      ? "bg-ember text-ink border-ember"
                      : "bg-black/50 text-white/80 border-white/20"
                  }`}
                  aria-label={flashEnabled ? "Disable flash" : "Enable flash"}
                >
                  {flashEnabled ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={() =>
                    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
                  }
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 active:scale-90 transition-transform"
                  aria-label="Switch camera"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Shutter bar */}
          <div className="relative z-30 pb-safe pb-8 pt-4 flex items-center justify-center">
            <motion.button
              onClick={triggerCapture}
              disabled={!cameraActive || isCapturing}
              whileTap={{ scale: 0.88 }}
              className="relative w-[78px] h-[78px] rounded-full flex items-center justify-center shadow-2xl disabled:opacity-40"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05), rgba(255,255,255,0.3))",
              }}
              aria-label="Take photo"
            >
              <div className="w-[62px] h-[62px] rounded-full bg-white shadow-[0_0_12px_rgba(0,0,0,0.5)] flex items-center justify-center">
                {isCapturing && (
                  <div className="w-full h-full rounded-full bg-ember/30 animate-ping" />
                )}
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
