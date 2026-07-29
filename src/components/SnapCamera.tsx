import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Camera, RefreshCw, Image as ImageIcon, Music, Heart,
  Settings, Wand2, Home, Play, Compass, Layers, Users,
  ChevronRight, Sliders, Grid, Timer as TimerIcon,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { STOCK_PHOTOS, MUSIC_TRACKS, MusicTrack, TEMPLATE_FAMILIES } from "../data/mockData";
import {
  CustomLayouts,
  PhotoSource,
  StatSlotId,
  TemplateFamily,
  TemplateLayout,
} from "../types";
import { triggerHaptic } from "../utils/haptics";
import TemplateCarousel from "./TemplateCarousel";
import StatLayer from "./StatLayer";
import SnapGuides from "./SnapGuides";
import type { SnapLine } from "../utils/snapping";
import {
  clearCustomLayout,
  hasCustomLayout,
  loadCustomLayouts,
  resetLayout,
  resolveLayout,
  saveCustomLayouts,
  storeCustomLayout,
} from "../utils/statLayouts";

type CaptureMode = "photo" | "video" | "burst" | "portrait";
type AspectRatio = "9:16" | "1:1" | "4:3" | "full";
type CameraViewMode = "camera" | "stories" | "memories";

export default function SnapCamera() {
  const navigate = useNavigate();
  const location = useLocation();
  const activityState = (location.state as {
    title?: string;
    distance?: string;
    pace?: string;
    time?: string;
  }) || {};

  // Extract activity data from navigation state with sensible defaults
  const activityTitle = activityState.title || "Morning Run";
  const activityDistance = activityState.distance || "8.4 km";
  const activityPace = activityState.pace || "6:12 /km";
  const activityTime = activityState.time || "52:18";

  // Parse distance for numeric display
  const distanceNumeric = parseFloat(activityDistance) || 8.4;
  const paceRaw = activityPace.replace(" /km", "");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const viewfinderRef = useRef<HTMLDivElement | null>(null);

  // Stat slot positions: customs are remembered per template, defaults come
  // from the template's own design.
  const [customLayouts, setCustomLayouts] = useState<CustomLayouts>(() =>
    loadCustomLayouts()
  );

  // Main View Navigation Mode (Swipe left -> Stories, Swipe right -> Memories, Center -> Camera)
  const [viewMode, setViewMode] = useState<CameraViewMode>("camera");

  // Stream & Hardware Camera Controls
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Capture modes
  const [captureMode, setCaptureMode] = useState<CaptureMode>("photo");

  // Toolbar & Feature Toggles
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [isGridEnabled, setIsGridEnabled] = useState<boolean>(false);
  const [isBeautyMode, setIsBeautyMode] = useState<boolean>(false);

  // Music Picker
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [showMusicSheet, setShowMusicSheet] = useState<boolean>(false);

  // Lens Settings
  const [filterIntensity, setFilterIntensity] = useState<number>(85);
  const [showLensSettings, setShowLensSettings] = useState<boolean>(false);

  // Video Recording & Burst state
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [burstCount, setBurstCount] = useState<number>(0);

  // Template carousel modal & camera settings
  const [showTemplateCarousel, setShowTemplateCarousel] = useState<boolean>(false);
  const [showCameraSettings, setShowCameraSettings] = useState<boolean>(false);

  // Template family — the camera's "lenses" are template families (stat layouts)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateFamily>(TEMPLATE_FAMILIES[0]);

  // Capture state
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Group mode — when on, dragging one stat moves all visible stats together
  const [isGrouped, setIsGrouped] = useState<boolean>(false);

  // Stat visibility selector
  const [showStatSelector, setShowStatSelector] = useState<boolean>(false);
  const [hiddenSlots, setHiddenSlots] = useState<Set<StatSlotId>>(new Set());

  const statData = {
    distance: distanceNumeric,
    distanceUnit: "km",
    pace: paceRaw,
    time: activityTime,
    title: activityTitle,
  };
  const statLayout = resolveLayout(selectedTemplate.id, customLayouts);

  // Derive visible layout — remove hidden slots from the full layout
  const visibleStatLayout: TemplateLayout = Object.fromEntries(
    Object.entries(statLayout).filter(([slot]) => !hiddenSlots.has(slot as StatSlotId))
  ) as TemplateLayout;
  const templateIsCustomized = hasCustomLayout(customLayouts, selectedTemplate.id);

  // Alignment guides shown only while a stat drag is snapped.
  const [snapGuides, setSnapGuides] = useState<SnapLine[]>([]);
  const [viewfinderSize, setViewfinderSize] = useState({ width: 0, height: 0 });

  const captureViewfinderSize = () => {
    const rect = viewfinderRef.current?.getBoundingClientRect();
    if (rect) setViewfinderSize({ width: rect.width, height: rect.height });
  };

  const handleStatLayoutChange = (next: TemplateLayout) => {
    // When grouped, propagate the drag offset to all visible stats
    if (isGrouped) {
      const changedSlot = (Object.keys(next) as StatSlotId[]).find(
        (slot) =>
          next[slot]?.x !== statLayout[slot]?.x ||
          next[slot]?.y !== statLayout[slot]?.y
      );
      if (changedSlot) {
        const oldPos = statLayout[changedSlot];
        const newPos = next[changedSlot];
        if (oldPos && newPos) {
          const dx = newPos.x - oldPos.x;
          const dy = newPos.y - oldPos.y;
          const adjusted: TemplateLayout = { ...next };
          for (const slot of Object.keys(statLayout) as StatSlotId[]) {
            if (slot !== changedSlot && statLayout[slot]) {
              adjusted[slot] = {
                x: Math.max(0, Math.min(100, (statLayout[slot]?.x ?? 0) + dx)),
                y: Math.max(0, Math.min(100, (statLayout[slot]?.y ?? 0) + dy)),
              };
            }
          }
          setCustomLayouts((prev) => {
            const updated = storeCustomLayout(prev, selectedTemplate.id, adjusted);
            saveCustomLayouts(updated);
            return updated;
          });
          return;
        }
      }
    }
    setCustomLayouts((prev) => {
      const updated = storeCustomLayout(prev, selectedTemplate.id, next);
      saveCustomLayouts(updated);
      return updated;
    });
  };

  const handleResetStatLayout = () => {
    setCustomLayouts((prev) => {
      const updated = clearCustomLayout(prev, selectedTemplate.id);
      saveCustomLayouts(updated);
      return updated;
    });
    triggerHaptic("light");
  };

  const lensFilter = ""; // No photo filter in camera — filters are editor-only

  // Initialize browser camera stream
  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera access unavailable, fallback to stock view:", err);
      setCameraError("Live camera preview inactive. Choose gallery or stock photos below.");
      setCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Double Tap on viewfinder to switch camera facing
  const handleDoubleTapViewfinder = (e: React.MouseEvent) => {
    if (e.detail === 2) {
      toggleCameraFacing();
    }
  };

  // Upload local device image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        try {
          sessionStorage.setItem("temp_captured_image", imageUrl);
        } catch {
          // ignore quota exceeded
        }
        navigate("/editor", {
          state: {
            capturedImage: imageUrl,
            selectedLensId: "minimal",
            lensFilter,
            selectedTemplateFamily: selectedTemplate,
            statLayout,
            appliedMusic: selectedMusic ? selectedMusic.title : null,
            activityTitle,
            activityDistance,
            activityPace,
            activityTime,
          },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Select stock image or gradient preset background
  const handleSelectStockPhoto = (photo: PhotoSource) => {
    try {
      sessionStorage.setItem("temp_captured_image", photo.url);
    } catch {
      // ignore
    }
    navigate("/editor", {
      state: {
        capturedImage: photo.url,
        selectedLensId: "minimal",
        lensFilter,
        selectedTemplateFamily: selectedTemplate,
        statLayout,
        appliedMusic: selectedMusic ? selectedMusic.title : null,
        activityTitle,
        activityDistance,
        activityPace,
        activityTime,
      },
    });
  };

  // Video recording timer handlers
  const startRecording = () => {
    setIsRecordingVideo(true);
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecordingVideo(false);
    executeCapture();
  };

  // Shutter action handler
  const triggerCapture = () => {
    if (captureMode === "video") {
      if (isRecordingVideo) {
        stopRecording();
      } else {
        startRecording();
      }
      return;
    }

    if (captureMode === "burst") {
      setBurstCount(5);
      let count = 5;
      const burstInterval = setInterval(() => {
        count--;
        setBurstCount(count);
        if (count <= 0) {
          clearInterval(burstInterval);
          executeCapture();
        }
      }, 200);
      return;
    }

    if (timerSeconds > 0) {
      setCountdown(timerSeconds);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            executeCapture();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      executeCapture();
    }
  };

  const executeCapture = () => {
    setIsCapturing(true);

    setTimeout(() => {
      let imageUrl = STOCK_PHOTOS[0].url;

      if (videoRef.current && cameraActive) {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 1080;
        canvas.height = videoRef.current.videoHeight || 1920;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (facingMode === "user") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          // 0.7 quality keeps data URLs ~300KB so they survive router state + sessionStorage
          imageUrl = canvas.toDataURL("image/jpeg", 0.7);
        }
      }

      try {
        sessionStorage.setItem("temp_captured_image", imageUrl);
      } catch {
        // ignore quota limits
      }

      setIsCapturing(false);
      navigate("/editor", {
        state: {
          capturedImage: imageUrl,
          selectedLensId: "minimal",
          lensFilter,
          selectedTemplateFamily: selectedTemplate,
          statLayout,
          appliedMusic: selectedMusic ? selectedMusic.title : null,
          aspectRatio: aspectRatio,
          activityTitle,
          activityDistance,
          activityPace,
          activityTime,
        },
      });
    }, 250);
  };

  return (
    <div className="bg-ink text-text-primary h-[100dvh] w-full overflow-hidden flex flex-col relative font-ui select-none">
      {/* Flash Blink Effect */}
      {flash === "on" && isCapturing && (
        <div className="absolute inset-0 bg-white z-50 animate-ping opacity-90 pointer-events-none"></div>
      )}

      {/* Countdown overlay animation */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-none"
          >
            <span className="text-9xl font-black text-ember drop-shadow-[0_0_40px_rgba(255,122,26,0.9)]">
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Burst Counter Badge */}
      {burstCount > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-ember text-ink font-black text-3xl px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
          BURST {burstCount}
        </div>
      )}

      {/* SWIPE NAVIGATION CONTAINER (Memories <- Camera -> Stories) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* STORIES VIEW (Swipe Left) */}
        {viewMode === "stories" && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="absolute inset-0 z-40 bg-ink p-screen-gutter pt-12 flex flex-col justify-between overflow-y-auto"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-screen-title text-2xl font-black text-white">Stories & Discover</h2>
                  <p className="text-xs text-text-secondary">Trending athlete stories in your feed</p>
                </div>
                <button
                  onClick={() => setViewMode("camera")}
                  className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {STOCK_PHOTOS.slice(0, 4).map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setViewMode("camera");
                      handleSelectStockPhoto(item);
                    }}
                    className="relative h-48 rounded-2xl overflow-hidden hairline-border group cursor-pointer"
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span className="text-[10px] text-ember">Story #{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        )}

        {/* MEMORIES VIEW (Swipe Right) */}
        {viewMode === "memories" && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className="absolute inset-0 z-40 bg-ink p-screen-gutter pt-12 flex flex-col justify-between overflow-y-auto"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-screen-title text-2xl font-black text-white">Memories & Saved</h2>
                  <p className="text-xs text-text-secondary">Your activity story archives</p>
                </div>
                <button
                  onClick={() => setViewMode("camera")}
                  className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {STOCK_PHOTOS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setViewMode("camera");
                      handleSelectStockPhoto(item);
                    }}
                    className="relative h-28 rounded-xl overflow-hidden hairline-border group cursor-pointer"
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        )}

        {/* MAIN CAMERA VIEWFINDER CANVAS */}
        <div
          ref={viewfinderRef}
          onClick={handleDoubleTapViewfinder}
          className={`relative w-full h-full bg-black flex flex-col justify-between overflow-hidden transition-all duration-300 ${
            aspectRatio === "1:1"
              ? "max-h-[80vw] my-auto rounded-3xl border border-white/10 shadow-2xl"
              : aspectRatio === "4:3"
              ? "max-h-[100vw] my-auto rounded-3xl border border-white/10 shadow-2xl"
              : ""
          }`}
        >
          {/* Live Video Stream or Fallback High-Res Image */}
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              } ${
                isNightMode ? "brightness-125 contrast-125 saturate-150" : ""
              } ${isBeautyMode ? "blur-[0.3px]" : ""}`}
              style={{ filter: lensFilter || undefined }}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-cover bg-center transition-all duration-500 ${
                isNightMode ? "brightness-125 contrast-125" : ""
              }`}
              style={{ backgroundImage: `url("${STOCK_PHOTOS[1].url}")`, filter: lensFilter || undefined }}
            ></div>
          )}

          {/* Rule of Thirds Grid Overlay */}
          {isGridEnabled && (
            <div className="absolute inset-0 z-10 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
              <div className="border-r border-b border-white/50"></div>
              <div className="border-r border-b border-white/50"></div>
              <div className="border-b border-white/50"></div>
              <div className="border-r border-b border-white/50"></div>
              <div className="border-r border-b border-white/50"></div>
              <div className="border-b border-white/50"></div>
              <div className="border-r border-white/50"></div>
              <div className="border-r border-white/50"></div>
              <div></div>
            </div>
          )}

          {/* Subtle Glass Scrim — ensures readability without overwhelming */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none z-10"></div>

          {/* Template Badge + Music — chrome, not a draggable slot */}
          <div className="absolute inset-x-0 top-0 z-20 p-screen-gutter pt-24 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex items-center gap-2"
            >
              <span
                className="px-3 py-1.5 rounded-full text-xs font-extrabold shadow-xl flex items-center gap-1.5 glass"
                style={{ color: selectedTemplate.accentColor }}
              >
                <span>{selectedTemplate.icon}</span>
                <span>{selectedTemplate.name}</span>
              </span>

              {selectedMusic && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg glass text-white">
                  <Music className="w-3.5 h-3.5 text-success" />
                  <span>{selectedMusic.title}</span>
                </span>
              )}

              {/* Stat toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatSelector(true);
                }}
                className="pointer-events-auto px-2.5 py-1.5 rounded-full text-xs font-bold glass text-white/60 hover:text-white flex items-center gap-1.5 active:scale-90 transition-all"
                aria-label="Toggle stats visibility"
              >
                <Sliders className="w-3 h-3" />
                <span>Stats</span>
              </button>

              {/* Group/UnGroup toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGrouped((g) => !g);
                  triggerHaptic("light");
                }}
                className={`pointer-events-auto px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 active:scale-90 transition-all ${
                  isGrouped
                    ? "bg-ember/30 text-ember border border-ember/40 shadow-[0_0_12px_rgba(255,122,26,0.2)]"
                    : "glass text-white/60 hover:text-white"
                }`}
                aria-label={isGrouped ? "Ungroup stats" : "Group stats"}
                title={isGrouped ? "Stats move together" : "Drag stats individually"}
              >
                <Layers className="w-3 h-3" />
                <span>{isGrouped ? "Grouped" : "Group"}</span>
              </button>

              {templateIsCustomized && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetStatLayout();
                  }}
                  className="pointer-events-auto px-3 py-1.5 rounded-full text-xs font-bold glass text-white/80 hover:text-white flex items-center gap-1.5 active:scale-90 transition-all"
                  aria-label="Reset stat layout"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset layout</span>
                </button>
              )}
            </motion.div>
          </div>

          {/* Draggable template stats. The wrapper must not swallow pointer
              events — only the chips themselves opt back in. */}
          <div className="absolute inset-0 z-20 drop-shadow-2xl pointer-events-none">
            <StatLayer
              templateId={selectedTemplate.id}
              data={statData}
              layout={visibleStatLayout}
              onLayoutChange={handleStatLayoutChange}
              constraintsRef={viewfinderRef}
              onDragStart={() => {
                captureViewfinderSize();
                triggerHaptic("light");
              }}
              onGuidesChange={setSnapGuides}
              onSnap={() => triggerHaptic("snap")}
            />
            <SnapGuides guides={snapGuides} canvas={viewfinderSize} />
          </div>

          {/* TOP BAR OVERLAY */}
          <div className="relative z-30 flex justify-between items-center p-screen-gutter pt-8">
            {/* Top Left — empty, space reserved for future controls */}
            <div className="flex items-center gap-2" />

            {/* Top Right Controls */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="flex items-center gap-2"
            >
              {/* Camera Switch */}
              <button
                onClick={toggleCameraFacing}
                className="w-10 h-10 rounded-full glass text-white/80 hover:text-white flex items-center justify-center active:scale-90 transition-all"
                aria-label="Switch camera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowCameraSettings(true)}
                className="w-10 h-10 rounded-full glass text-white/80 hover:text-white flex items-center justify-center active:scale-90 transition-all"
                aria-label="Camera settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </motion.div>
          </div>

          {/* CAPTURE MODES & TEMPLATE CAROUSEL AREA — templates = lenses = stickers */}
          <div className="relative z-30 pb-safe pb-4 flex flex-col items-center gap-1.5">
            {/* TEMPLATE FAMILY CAROUSEL — Snapchat-style circles, shows stat layout options */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
              className="w-full space-y-2"
            >
              {/* Template families — Snapchat-style 64px circles, always-visible labels */}
              <div className="w-full overflow-hidden">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                  className="flex items-start gap-3 px-3 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: "none" }}
                >
                  {TEMPLATE_FAMILIES.map((tmpl, idx) => {
                    const isActive = tmpl.id === selectedTemplate.id;
                    return (
                      <motion.button
                        key={tmpl.id}
                        variants={{
                          hidden: { opacity: 0, y: 10, scale: 0.9 },
                          visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } },
                        }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          // Reset layout for the newly selected template
                          setCustomLayouts((prev) => {
                            const updated = resetLayout(prev, tmpl.id);
                            saveCustomLayouts(updated);
                            return updated;
                          });
                          setHiddenSlots(new Set());
                          setSelectedTemplate(tmpl);
                          triggerHaptic("selection");
                        }}
                        className="flex flex-col items-center gap-1 shrink-0 relative w-[64px]"
                      >
                        {/* Template circle with animated active ring */}
                        <div className="relative">
                          {isActive && (
                            <motion.div
                              layoutId="tmplActiveRing"
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className="absolute -inset-[3px] rounded-full"
                              style={{
                                background: `conic-gradient(from 0deg, ${tmpl.accentColor}, rgba(255,255,255,0.4), ${tmpl.accentColor}88, ${tmpl.accentColor})`,
                                boxShadow: `0 0 20px ${tmpl.accentColor}66`,
                              }}
                            />
                          )}
                          <div
                            className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-200 overflow-hidden ${
                              isActive
                                ? "scale-100 shadow-lg"
                                : "opacity-55 hover:opacity-85"
                            }`}
                            style={{
                              background: isActive
                                ? `radial-gradient(circle at 35% 30%, ${tmpl.accentColor}55, rgba(0,0,0,0.7))`
                                : "rgba(255,255,255,0.08)",
                              boxShadow: isActive
                                ? `inset 0 0 12px ${tmpl.accentColor}33, 0 0 8px rgba(0,0,0,0.4)`
                                : "inset 0 0 4px rgba(255,255,255,0.06)",
                              backdropFilter: "blur(12px)",
                              WebkitBackdropFilter: "blur(12px)",
                            }}
                          >
                            {/* Template thumbnail — accent color + abstract stat dots */}
                            <div
                              className="absolute inset-0"
                              style={{
                                background: `radial-gradient(circle at 30% 30%, ${tmpl.accentColor}44, ${tmpl.accentColor}22 60%, transparent 80%)`,
                              }}
                            />
                            <svg viewBox="0 0 40 40" width="36" height="36" className="relative">
                              <circle cx="12" cy="14" r="3.5" fill={tmpl.accentColor} opacity="0.8" />
                              <circle cx="28" cy="20" r="3" fill={tmpl.accentColor} opacity="0.6" />
                              <rect x="8" y="26" width="14" height="3" rx="1.5" fill={tmpl.accentColor} opacity="0.4" />
                              <rect x="24" y="28" width="10" height="2.5" rx="1.25" fill={tmpl.accentColor} opacity="0.3" />
                            </svg>
                            <span
                              style={{
                                position: "absolute",
                                fontSize: "12px",
                                fontWeight: 800,
                                color: `${tmpl.accentColor}33`,
                                fontFamily: "var(--font-display)",
                                letterSpacing: "-0.05em",
                                bottom: "2px",
                                right: "3px",
                                lineHeight: 1,
                              }}
                            >
                              {tmpl.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        {/* Always-visible label */}
                        <span
                          className={`text-[9px] font-semibold text-center leading-tight transition-all duration-200 ${
                            isActive
                              ? "text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]"
                              : "text-white/60"
                          }`}
                          style={{ maxWidth: "64px" }}
                        >
                          {tmpl.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>
            </motion.div>

            {/* SNAPCHAT-STYLE SHUTTER BAR — gallery thumbnail, shutter, effects */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
              className="w-full px-screen-gutter flex items-center justify-center gap-8 pt-1"
            >
              {/* Gallery Import — circular thumb preview (Snapchat style) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-[44px] h-[44px] rounded-full overflow-hidden glass border border-white/15 flex items-center justify-center text-white/60 hover:text-white active:scale-90 transition-all shrink-0"
                title="Import from Gallery"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

              {/* Shutter — Snapchat-style dual ring */}
              <motion.button
                onClick={triggerCapture}
                disabled={isCapturing}
                whileTap={{ scale: 0.88 }}
                className={`relative w-[78px] h-[78px] rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  isRecordingVideo
                    ? "animate-[recordPulse_1.5s_ease-in-out_infinite]"
                    : ""
                }`}
                style={{
                  background: isRecordingVideo
                    ? "transparent"
                    : `conic-gradient(from 0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05), rgba(255,255,255,0.3))`,
                }}
              >
                <div
                  className={`w-[62px] h-[62px] rounded-full transition-all duration-300 flex items-center justify-center ${
                    isRecordingVideo
                      ? "bg-success rounded-lg scale-[0.55] shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                      : "bg-white shadow-[0_0_12px_rgba(0,0,0,0.5)]"
                  }`}
                >
                  {isCapturing && <div className="w-full h-full rounded-full bg-ember/30 animate-ping" />}
                </div>
              </motion.button>

              {/* Effects/Templates — lens icon (Snapchat style) */}
              <button
                onClick={() => setShowTemplateCarousel(true)}
                className="w-[44px] h-[44px] rounded-full glass border border-white/15 flex items-center justify-center text-white/60 hover:text-white active:scale-90 transition-all shrink-0"
                title="Effects & Templates"
              >
                <Wand2 className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <motion.nav
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
        className="bg-black/80 backdrop-blur-xl border-t border-white/10 px-screen-gutter py-2 flex justify-around items-center z-40"
        aria-label="Main navigation"
      >
        <button
          onClick={() => navigate("/home")}
          className="flex flex-col items-center gap-0.5 text-text-secondary hover:text-white transition-colors min-w-[48px] py-1"
          aria-label="Home"
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-medium">Home</span>
        </button>

        <button
          onClick={() => setViewMode("stories")}
          className="flex flex-col items-center gap-0.5 text-text-secondary hover:text-white transition-colors min-w-[48px] py-1"
          aria-label="Discover"
        >
          <Compass className="w-5 h-5" />
          <span className="text-[9px] font-medium">Discover</span>
        </button>

        <button
          onClick={() => setViewMode("camera")}
          className="flex flex-col items-center text-ember transition-colors min-w-[48px] py-1"
          aria-label="Camera"
          aria-current="page"
        >
          <div className="w-10 h-10 rounded-full bg-ember text-ink flex items-center justify-center shadow-[0_0_12px_rgba(255,122,26,0.35)]">
            <Camera className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setViewMode("memories")}
          className="flex flex-col items-center gap-0.5 text-text-secondary hover:text-white transition-colors min-w-[48px] py-1"
          aria-label="Community"
        >
          <Layers className="w-5 h-5" />
          <span className="text-[9px] font-medium">Community</span>
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="flex flex-col items-center gap-0.5 text-text-secondary hover:text-white transition-colors min-w-[48px] py-1"
          aria-label="Profile"
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-medium">Profile</span>
        </button>
      </motion.nav>

      {/* MUSIC PICKER MODAL SHEET */}
      <AnimatePresence>
        {showMusicSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Select Workout Music"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="glass-surface rounded-t-3xl p-screen-gutter max-h-[70vh] overflow-y-auto space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-section-header mb-0.5">Select Workout Music</h3>
                  <p className="text-xs text-text-secondary">Sync music tracks with your story video</p>
                </div>
                <button
                  onClick={() => setShowMusicSheet(false)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {MUSIC_TRACKS.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      setSelectedMusic(track);
                      setIsPlayingMusic(true);
                      setShowMusicSheet(false);
                    }}
                    className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                      selectedMusic?.id === track.id
                        ? "bg-success-dim border border-success/40 text-white"
                        : "bg-white/5 hover:bg-white/10 text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={track.coverUrl} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="text-sm font-bold">{track.title}</h4>
                        <p className="text-xs text-text-secondary">{track.artist} • {track.genre}</p>
                      </div>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center">
                      <Play className="w-4 h-4 fill-white" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LENS SETTINGS MODAL */}
      <AnimatePresence>
        {showLensSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Lens Adjustments"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="glass-surface rounded-t-3xl p-screen-gutter space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h3 className="text-section-header">Lens Adjustments</h3>
                <button
                  onClick={() => setShowLensSettings(false)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 py-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Filter Intensity</span>
                    <span className="text-ember font-bold">{filterIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filterIntensity}
                    onChange={(e) => setFilterIntensity(Number(e.target.value))}
                    className="w-full accent-ember"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TEMPLATE PICKER SHEET */}
      <AnimatePresence>
        {showTemplateCarousel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Choose Template Style"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="glass-surface rounded-t-3xl p-screen-gutter pt-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-section-header">Template Style</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Choose how your stats are displayed</p>
                </div>
                <button
                  onClick={() => setShowTemplateCarousel(false)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <TemplateCarousel
                templates={TEMPLATE_FAMILIES}
                selectedId={selectedTemplate.id}
                onSelect={(template) => {
                  setSelectedTemplate(template);
                  setShowTemplateCarousel(false);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CAMERA SETTINGS SHEET */}
      <AnimatePresence>
        {showCameraSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Camera Options"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="glass-surface rounded-t-3xl p-screen-gutter space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h3 className="text-section-header">Camera Options</h3>
                <button
                  onClick={() => setShowCameraSettings(false)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 py-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-hairline">
                  <span>Auto Watermark</span>
                  <input type="checkbox" defaultChecked className="accent-ember" />
                </div>
                <div className="flex justify-between items-center py-2 border-b border-hairline">
                  <span>Save Originals to Device</span>
                  <input type="checkbox" defaultChecked className="accent-ember" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STAT SELECTOR BOTTOM SHEET — add/remove visible stats */}
      <AnimatePresence>
        {showStatSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Toggle Stats"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="glass-surface rounded-t-3xl p-screen-gutter space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-section-header">Toggle Stats</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Show or hide individual stats on your template</p>
                </div>
                <button
                  onClick={() => setShowStatSelector(false)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 pb-2">
                {(["distance", "pace", "time", "title", "accent"] as StatSlotId[]).map(
                  (slot) => {
                    const isVisible = !hiddenSlots.has(slot);
                    const slotLabels: Record<StatSlotId, string> = {
                      distance: "Distance",
                      pace: "Pace",
                      time: "Time",
                      title: "Activity Title",
                      accent: "Accent Decoration",
                    };
                    return (
                      <button
                        key={slot}
                        onClick={() => {
                          setHiddenSlots((prev) => {
                            const next = new Set(prev);
                            if (next.has(slot)) next.delete(slot);
                            else next.add(slot);
                            return next;
                          });
                          triggerHaptic("light");
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                          isVisible
                            ? "bg-ember-dim border border-ember/30"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${
                              isVisible
                                ? "bg-ember text-ink"
                                : "bg-white/10 text-white/40"
                            }`}
                          >
                            {slot === "distance"
                              ? "D"
                              : slot === "pace"
                              ? "P"
                              : slot === "time"
                              ? "T"
                              : slot === "title"
                              ? "A"
                              : "✦"}
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              isVisible ? "text-white" : "text-white/40"
                            }`}
                          >
                            {slotLabels[slot]}
                          </span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isVisible
                              ? "bg-ember border-ember"
                              : "border-white/20 bg-transparent"
                          }`}
                        >
                          {isVisible && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-ink"
                            />
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => setShowStatSelector(false)}
                className="w-full py-2.5 rounded-full bg-ember text-ink font-extrabold text-sm shadow-md active:scale-95 transition-transform"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
