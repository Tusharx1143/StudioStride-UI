import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Timer as TimerIcon,
  Music,
  Heart,
  Sliders,
  Search,
  Bell,
  UserPlus,
  Settings,
  Moon,
  Grid,
  Maximize2,
  Video,
  Wand2,
  Aperture,
  Home,
  Play,
  Pause,
  Users,
  Compass,
  Check,
  Share2,
  Flame,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Circle,
  Layers,
  Sparkle
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { LENS_TEMPLATES_EXPANDED, STOCK_PHOTOS, MUSIC_TRACKS, MusicTrack, TEMPLATE_FAMILIES } from "../data/mockData";
import {
  CustomLayouts,
  LensTemplate,
  PhotoSource,
  TemplateFamily,
  TemplateLayout,
} from "../types";
import { triggerHaptic } from "../utils/haptics";
import TemplateCarousel from "./TemplateCarousel";
import StatLayer from "./StatLayer";
import {
  clearCustomLayout,
  hasCustomLayout,
  loadCustomLayouts,
  resolveLayout,
  saveCustomLayouts,
  storeCustomLayout,
} from "../utils/statLayouts";

export const LENS_CATEGORIES = [
  "All",
  "AI",
  "Trending",
  "Portrait",
  "HDR",
  "Vintage",
  "Food",
  "Travel",
  "Beauty",
  "Neon",
  "B&W",
  "Custom"
];

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

  // Optical Zoom & Camera Lenses
  const [isPortraitDepthMode, setIsPortraitDepthMode] = useState<boolean>(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("photo");

  // Toolbar & Feature Toggles
  const [isToolbarExpanded, setIsToolbarExpanded] = useState<boolean>(true);
  const [hdQuality, setHdQuality] = useState<"SD" | "HD" | "4K">("HD");
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

  // Modals & Drawers
  const [showProfileDrawer, setShowProfileDrawer] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showFriendsModal, setShowFriendsModal] = useState<boolean>(false);
  const [showCameraSettings, setShowCameraSettings] = useState<boolean>(false);
  const [showTemplateCarousel, setShowTemplateCarousel] = useState<boolean>(false);

  // Lenses & Carousel state
  const [lenses, setLenses] = useState<LensTemplate[]>(LENS_TEMPLATES_EXPANDED);
  const [selectedLensIndex, setSelectedLensIndex] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Template family selection
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateFamily>(TEMPLATE_FAMILIES[0]);
  const [templateLabelVisible, setTemplateLabelVisible] = useState<boolean>(false);

  const statData = {
    distance: distanceNumeric,
    distanceUnit: "km",
    pace: paceRaw,
    time: activityTime,
    title: activityTitle,
  };
  const statLayout = resolveLayout(selectedTemplate.id, customLayouts);
  const templateIsCustomized = hasCustomLayout(customLayouts, selectedTemplate.id);

  const handleStatLayoutChange = (next: TemplateLayout) => {
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
  const templateLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredLenses = lenses.filter((l) => {
    if (activeCategory === "All") return true;
    return l.category === activeCategory;
  });

  const activeLens = filteredLenses[selectedLensIndex] || lenses[0];

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

  const toggleFavoriteLens = (lensId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLenses((prev) =>
      prev.map((l) => (l.id === lensId ? { ...l, isFavorite: !l.isFavorite } : l))
    );
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
            selectedLensId: activeLens?.id || "minimal",
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
        selectedLensId: activeLens?.id || "minimal",
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
          imageUrl = canvas.toDataURL("image/jpeg", 0.95);
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
          selectedLensId: activeLens?.id || "minimal",
          selectedTemplateFamily: selectedTemplate,
          statLayout,
          appliedMusic: selectedMusic ? selectedMusic.title : null,
          aspectRatio: aspectRatio,
          hdQuality: hdQuality,
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
            <span className="text-9xl font-black text-volt drop-shadow-[0_0_40px_rgba(244,228,9,0.9)]">
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Burst Counter Badge */}
      {burstCount > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-volt text-ink font-black text-3xl px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
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
                      <span className="text-[10px] text-volt">Story #{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setViewMode("camera")}
              className="w-full bg-volt text-ink font-bold py-3 rounded-xl mt-6"
            >
              Back to Camera
            </button>
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

            <button
              onClick={() => setViewMode("camera")}
              className="w-full bg-surface-raised text-white font-bold py-3 rounded-xl mt-6 hairline-border"
            >
              Back to Camera
            </button>
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
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              } ${
                isNightMode ? "brightness-125 contrast-125 saturate-150" : ""
              } ${isBeautyMode ? "blur-[0.3px]" : ""}`}
              style={{}}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-cover bg-center transition-transform duration-500 ${
                isNightMode ? "brightness-125 contrast-125" : ""
              }`}
              style={{ backgroundImage: `url("${STOCK_PHOTOS[1].url}")` }}
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

          {/* Dark Glass Scrim Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none z-10"></div>

          {/* Template Badge + Music — chrome, not a draggable slot */}
          <div className="absolute inset-x-0 top-0 z-20 p-screen-gutter pt-24 pointer-events-none">
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-extrabold shadow-xl flex items-center gap-1.5 backdrop-blur-md border border-white/10"
                style={{ backgroundColor: selectedTemplate.accentColor + "20", color: selectedTemplate.accentColor }}
              >
                <span>{selectedTemplate.icon}</span>
                <span>{selectedTemplate.name}</span>
              </span>

              {selectedMusic && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-pink-500/80 text-white backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                  <Music className="w-3.5 h-3.5" />
                  <span>{selectedMusic.title}</span>
                </span>
              )}

              {templateIsCustomized && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetStatLayout();
                  }}
                  className="pointer-events-auto px-3 py-1.5 rounded-full text-xs font-bold bg-black/60 text-white/80 backdrop-blur-md border border-white/10 flex items-center gap-1.5 active:scale-95 transition-transform"
                  aria-label="Reset stat layout"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset layout</span>
                </button>
              )}
            </div>
          </div>

          {/* Draggable template stats. The wrapper must not swallow pointer
              events — only the chips themselves opt back in. */}
          <div className="absolute inset-0 z-20 drop-shadow-2xl pointer-events-none">
            <StatLayer
              templateId={selectedTemplate.id}
              data={statData}
              layout={statLayout}
              onLayoutChange={handleStatLayoutChange}
              constraintsRef={viewfinderRef}
              onDragStart={() => triggerHaptic("light")}
            />
          </div>

          {/* TOP BAR OVERLAY */}
          <div className="relative z-30 flex justify-between items-center p-screen-gutter pt-8">
            {/* Top Left — empty, space reserved for future controls */}
            <div className="flex items-center gap-2" />

            {/* Top Right Controls */}
            <div className="flex items-center gap-2">
              {/* Camera Switch */}
              <button
                onClick={toggleCameraFacing}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md hairline-border text-white flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Switch camera"
              >
                <RefreshCw className="w-5 h-5 stroke-[1.75]" />
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowCameraSettings(true)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md hairline-border text-white flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Camera settings"
              >
                <Settings className="w-5 h-5 stroke-[1.75]" />
              </button>
            </div>
          </div>

          {/* CAPTURE MODES & SNAPCHAT LENS CAROUSEL AREA */}
          <div className="relative z-30 pb-safe pb-4 flex flex-col items-center gap-2">
            {/* Inline Template Carousel (toggled by the Templates button below) */}
            <AnimatePresence>
              {showTemplateCarousel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full overflow-hidden"
                >
                  <TemplateCarousel
                    templates={TEMPLATE_FAMILIES}
                    selectedId={selectedTemplate.id}
                    onSelect={(template) => {
                      setSelectedTemplate(template);
                      setTemplateLabelVisible(true);
                      if (templateLabelTimerRef.current) clearTimeout(templateLabelTimerRef.current);
                      templateLabelTimerRef.current = setTimeout(() => {
                        setTemplateLabelVisible(false);
                      }, 1000);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Template Selection Label */}
            <div className="h-6 flex items-center justify-center">
              <AnimatePresence>
                {templateLabelVisible && (
                  <motion.span
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="px-3 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white"
                  >
                    {selectedTemplate.name}{" "}
                    <span className="text-volt">Selected</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* MAIN SHUTTER BUTTON & GALLERY IMPORT BAR */}
            <div className="w-full px-screen-gutter flex items-center justify-between max-w-xs pt-1">
              {/* Local Device Gallery Input */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border flex items-center justify-center text-white active:scale-95 transition-transform"
                title="Import from Gallery"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Snapchat Large Shutter Button */}
              <button
                onClick={triggerCapture}
                disabled={isCapturing}
                className={`relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform shadow-2xl ${
                  isRecordingVideo ? "border-rose-500 animate-pulse" : ""
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-full transition-colors flex items-center justify-center ${
                    isRecordingVideo ? "bg-rose-500 rounded-lg scale-75" : "bg-white hover:bg-volt"
                  }`}
                >
                  {isCapturing && (
                    <div className="w-full h-full rounded-full bg-volt animate-ping"></div>
                  )}
                </div>
              </button>

              {/* Template Selector Trigger */}
              <button
                onClick={() => setShowTemplateCarousel((prev) => !prev)}
                className={`w-12 h-12 rounded-full backdrop-blur-md hairline-border flex items-center justify-center active:scale-95 transition-transform ${
                  showTemplateCarousel ? "bg-volt text-ink" : "bg-black/60 text-volt"
                }`}
                title="Templates"
              >
                <Wand2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="bg-black/90 backdrop-blur-xl border-t border-white/10 px-screen-gutter py-3 flex justify-around items-center z-40" aria-label="Main navigation">
        <button
          onClick={() => navigate("/home")}
          className="flex flex-col items-center text-text-secondary hover:text-white transition-colors"
          aria-label="Home"
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setViewMode("stories")}
          className="flex flex-col items-center text-text-secondary hover:text-white transition-colors"
          aria-label="Discover"
        >
          <Compass className="w-6 h-6" />
          <span className="text-[10px] mt-0.5">Discover</span>
        </button>

        <button
          onClick={() => setViewMode("camera")}
          className="flex flex-col items-center text-volt transition-colors"
          aria-label="Camera"
          aria-current="page"
        >
          <div className="w-10 h-10 rounded-full bg-volt text-ink flex items-center justify-center font-black">
            <Camera className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setViewMode("memories")}
          className="flex flex-col items-center text-text-secondary hover:text-white transition-colors"
          aria-label="Community"
        >
          <Layers className="w-6 h-6" />
          <span className="text-[10px] mt-0.5">Community</span>
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="flex flex-col items-center text-text-secondary hover:text-white transition-colors"
          aria-label="Profile"
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] mt-0.5">Profile</span>
        </button>
      </nav>

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
              className="bg-surface rounded-t-3xl hairline-border-t p-screen-gutter max-h-[70vh] overflow-y-auto space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-hairline">
                <div>
                  <h3 className="text-section-header mb-0.5">Select Workout Music</h3>
                  <p className="text-xs text-text-secondary">Sync music tracks with your story video</p>
                </div>
                <button
                  onClick={() => setShowMusicSheet(false)}
                  className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
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
                        ? "bg-pink-500/20 border border-pink-500 text-white"
                        : "bg-surface-raised hover:bg-surface-raised/80 text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={track.coverUrl} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="text-sm font-bold">{track.title}</h4>
                        <p className="text-xs text-text-secondary">{track.artist} • {track.genre}</p>
                      </div>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center">
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
              className="bg-surface rounded-t-3xl hairline-border-t p-screen-gutter space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-hairline">
                <h3 className="text-section-header">Lens Adjustments</h3>
                <button
                  onClick={() => setShowLensSettings(false)}
                  className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 py-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Filter Intensity</span>
                    <span className="text-volt font-bold">{filterIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filterIntensity}
                    onChange={(e) => setFilterIntensity(Number(e.target.value))}
                    className="w-full accent-volt"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROFILE DRAWER OVERLAY */}
      <AnimatePresence>
        {showProfileDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-start"
            role="dialog"
            aria-modal="true"
            aria-label="Profile drawer"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="bg-surface w-4/5 max-w-xs h-full p-screen-gutter flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-white">Profile</h3>
                  <button
                    onClick={() => setShowProfileDrawer(false)}
                    className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col items-center mb-6 text-center">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                    alt="User Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-volt mb-2"
                  />
                  <h4 className="text-base font-black text-white">Alex Morgan</h4>
                  <p className="text-xs text-text-secondary">@alex_runner • Pro Athlete</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowProfileDrawer(false);
                      navigate("/profile");
                    }}
                    className="w-full text-left py-2.5 px-3 rounded-xl bg-surface-raised text-xs font-bold text-white flex items-center justify-between"
                  >
                    <span>View Full Profile</span>
                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowProfileDrawer(false);
                  navigate("/");
                }}
                className="w-full bg-rose-500/20 text-rose-400 font-bold py-2.5 rounded-xl text-xs"
              >
                Log Out
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH MODAL */}
      <AnimatePresence>
        {showSearchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-screen-gutter pt-12"
            role="dialog"
            aria-modal="true"
            aria-label="Search lenses and music"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 bg-surface-raised rounded-xl px-3 py-2 flex items-center gap-2 border border-hairline">
                <Search className="w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search lenses, music, creators..."
                  className="bg-transparent text-xs text-white outline-none w-full"
                />
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-xs text-volt font-bold"
              >
                Cancel
              </button>
            </div>
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
              className="bg-surface rounded-t-3xl hairline-border-t p-screen-gutter space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-hairline">
                <h3 className="text-section-header">Camera Options</h3>
                <button
                  onClick={() => setShowCameraSettings(false)}
                  className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 py-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-hairline">
                  <span>Auto Watermark</span>
                  <input type="checkbox" defaultChecked className="accent-volt" />
                </div>
                <div className="flex justify-between items-center py-2 border-b border-hairline">
                  <span>Save Originals to Device</span>
                  <input type="checkbox" defaultChecked className="accent-volt" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
