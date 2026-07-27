import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Sparkles,
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
import { useNavigate } from "react-router-dom";
import { LENS_TEMPLATES_EXPANDED, STOCK_PHOTOS, MUSIC_TRACKS, MusicTrack } from "../data/mockData";
import { LensTemplate, PhotoSource } from "../types";
import GestureSwipeCarousel from "./GestureSwipeCarousel";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [zoomLevel, setZoomLevel] = useState<"0.5x" | "1x" | "2x" | "3x">("1x");
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
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [selectedSourceCategory, setSelectedSourceCategory] = useState<string>("All");

  // Lenses & Carousel state
  const [lenses, setLenses] = useState<LensTemplate[]>(LENS_TEMPLATES_EXPANDED);
  const [selectedLensIndex, setSelectedLensIndex] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

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
            appliedMusic: selectedMusic ? selectedMusic.title : null,
          },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Select stock image or gradient preset background
  const handleSelectStockPhoto = (photo: PhotoSource) => {
    setShowStockModal(false);
    try {
      sessionStorage.setItem("temp_captured_image", photo.url);
    } catch {
      // ignore
    }
    navigate("/editor", {
      state: {
        capturedImage: photo.url,
        selectedLensId: activeLens?.id || "minimal",
        appliedMusic: selectedMusic ? selectedMusic.title : null,
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
          appliedMusic: selectedMusic ? selectedMusic.title : null,
          aspectRatio: aspectRatio,
          hdQuality: hdQuality,
        },
      });
    }, 250);
  };

  // Zoom scale multiplier
  const getZoomScaleClass = () => {
    switch (zoomLevel) {
      case "0.5x":
        return "scale-100 object-cover"; // ultra wide simulation
      case "2x":
        return "scale-125 transition-transform duration-300";
      case "3x":
        return "scale-150 transition-transform duration-300";
      default:
        return "scale-105 transition-transform duration-300";
    }
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
              className={`absolute inset-0 w-full h-full object-cover ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              } ${getZoomScaleClass()} ${
                isNightMode ? "brightness-125 contrast-125 saturate-150" : ""
              } ${isBeautyMode ? "blur-[0.3px]" : ""}`}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-cover bg-center transition-all duration-500 ${getZoomScaleClass()} ${
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

          {/* Active Lens Live Graphics Overlay */}
          <div className="absolute inset-0 z-20 p-screen-gutter pt-24 pb-44 flex flex-col justify-between pointer-events-none">
            {/* Active Lens Badge */}
            <div className="self-start flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold shadow-xl flex items-center gap-1.5 backdrop-blur-md ${
                  activeLens?.badgeColor || "bg-volt text-ink"
                }`}
              >
                <span>{activeLens?.icon || "🏃"}</span>
                <span>{activeLens?.name || "Stride"} Lens</span>
              </span>

              {selectedMusic && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-pink-500/80 text-white backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                  <Music className="w-3.5 h-3.5" />
                  <span>{selectedMusic.title}</span>
                </span>
              )}
            </div>

            {/* Lens Specific Stats Card Overlay */}
            <div className="w-full max-w-xs drop-shadow-2xl">
              {activeLens?.overlayType === "minimal" && (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                      8.42
                    </span>
                    <span className="text-lg text-volt font-bold">km</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-black/60 backdrop-blur-md hairline-border rounded-xl px-3 py-1.5 text-xs text-white">
                      Pace: <span className="text-volt font-bold">6:12</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-md hairline-border rounded-xl px-3 py-1.5 text-xs text-white">
                      Time: <span className="font-bold">52:18</span>
                    </div>
                  </div>
                </div>
              )}

              {activeLens?.overlayType === "strava" && (
                <div className="bg-[#FC4C02]/90 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md border border-white/20">
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-200 mb-1">
                    STRAVA ACTIVITY ⚡
                  </div>
                  <div className="text-3xl font-extrabold">8.42 KM</div>
                  <div className="text-xs opacity-90 mt-1">Golden Gate Trail Run</div>
                </div>
              )}

              {activeLens?.overlayType === "cyberpunk" && (
                <div className="border border-cyan-400 bg-black/80 text-cyan-300 p-3.5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] font-mono text-xs">
                  <div className="flex justify-between mb-1">
                    <span>[ CYBER HUD ]</span>
                    <span className="animate-pulse text-red-400">● RECORDING</span>
                  </div>
                  <div className="text-3xl font-black text-white">08.40 KM</div>
                </div>
              )}

              {activeLens?.overlayType === "vintage" && (
                <div className="bg-amber-50/90 text-zinc-900 p-3 rounded-xl font-serif rotate-[-1deg]">
                  <div className="text-[10px] text-zinc-600">JUL 27, 2026 — 06:42 AM</div>
                  <div className="text-2xl font-bold">8.4 kilometers</div>
                </div>
              )}
            </div>
          </div>

          {/* TOP BAR OVERLAY */}
          <div className="relative z-30 flex justify-between items-center p-screen-gutter pt-8">
            {/* Top Left Controls */}
            <div className="flex items-center gap-2">
              {/* Profile Avatar with notification indicator */}
              <button
                onClick={() => setShowProfileDrawer(true)}
                className="relative w-10 h-10 rounded-full bg-surface-raised border-2 border-white/20 p-0.5 overflow-hidden active:scale-95 transition-transform"
                title="Profile"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                  alt="Profile Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
                <span className="absolute top-0 right-0 w-3 h-3 bg-volt rounded-full border-2 border-black"></span>
              </button>

              {/* Search Button */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md hairline-border text-white flex items-center justify-center active:scale-95 transition-transform"
                title="Search Lenses & Sounds"
              >
                <Search className="w-5 h-5 text-white stroke-[1.75]" />
              </button>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button
                onClick={() => setShowNotificationsModal(true)}
                className="relative w-10 h-10 rounded-full bg-black/50 backdrop-blur-md hairline-border text-white flex items-center justify-center active:scale-95 transition-transform"
                title="Notifications"
              >
                <Bell className="w-5 h-5 stroke-[1.75]" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>

              {/* Add Friends */}
              <button
                onClick={() => setShowFriendsModal(true)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md hairline-border text-white flex items-center justify-center active:scale-95 transition-transform"
                title="Add Friends"
              >
                <UserPlus className="w-5 h-5 stroke-[1.75]" />
              </button>

              {/* Camera Switch */}
              <button
                onClick={toggleCameraFacing}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md hairline-border text-white flex items-center justify-center active:scale-95 transition-transform"
                title="Switch Camera"
              >
                <RefreshCw className="w-5 h-5 stroke-[1.75]" />
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowCameraSettings(true)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md hairline-border text-white flex items-center justify-center active:scale-95 transition-transform"
                title="Camera Settings"
              >
                <Settings className="w-5 h-5 stroke-[1.75]" />
              </button>
            </div>
          </div>

          {/* RIGHT FLOATING TOOLBAR */}
          <div className="absolute top-24 right-4 z-30 flex flex-col items-center">
            <div className="bg-black/50 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 flex flex-col items-center gap-3 shadow-2xl transition-all">
              {/* Expand / Collapse Button */}
              <button
                onClick={() => setIsToolbarExpanded((prev) => !prev)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                title="Expand Toolbar"
              >
                {isToolbarExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {/* Flash Toggle */}
              <button
                onClick={() =>
                  setFlash((prev) => (prev === "off" ? "on" : prev === "on" ? "auto" : "off"))
                }
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  flash !== "off" ? "bg-volt text-ink font-bold" : "text-white hover:bg-white/10"
                }`}
                title="Flash"
              >
                {flash === "on" ? <Zap className="w-4 h-4 fill-ink" /> : <ZapOff className="w-4 h-4" />}
              </button>

              {/* Music Picker */}
              <button
                onClick={() => setShowMusicSheet(true)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  selectedMusic ? "bg-pink-500 text-white" : "text-white hover:bg-white/10"
                }`}
                title="Music Picker"
              >
                <Music className="w-4 h-4" />
              </button>

              {/* HD Toggle */}
              <button
                onClick={() =>
                  setHdQuality((prev) => (prev === "HD" ? "4K" : prev === "4K" ? "SD" : "HD"))
                }
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${
                  hdQuality === "4K" ? "bg-volt text-ink" : "text-white hover:bg-white/10"
                }`}
                title="HD Quality"
              >
                {hdQuality}
              </button>

              {/* Expanded Toolbar Features */}
              {isToolbarExpanded && (
                <>
                  {/* Aspect Ratio Selector */}
                  <button
                    onClick={() =>
                      setAspectRatio((prev) =>
                        prev === "9:16" ? "1:1" : prev === "1:1" ? "4:3" : "9:16"
                      )
                    }
                    className="w-9 h-9 rounded-xl text-white hover:bg-white/10 flex items-center justify-center text-[10px] font-bold"
                    title="Aspect Ratio"
                  >
                    {aspectRatio}
                  </button>

                  {/* Night Mode */}
                  <button
                    onClick={() => setIsNightMode((prev) => !prev)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isNightMode ? "bg-indigo-500 text-white" : "text-white hover:bg-white/10"
                    }`}
                    title="Night Mode"
                  >
                    <Moon className="w-4 h-4" />
                  </button>

                  {/* Timer Toggle */}
                  <button
                    onClick={() =>
                      setTimerSeconds((prev) => (prev === 0 ? 3 : prev === 3 ? 10 : 0))
                    }
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      timerSeconds > 0 ? "bg-volt text-ink font-bold" : "text-white hover:bg-white/10"
                    }`}
                    title="Timer"
                  >
                    <TimerIcon className="w-4 h-4" />
                  </button>

                  {/* Grid Overlay */}
                  <button
                    onClick={() => setIsGridEnabled((prev) => !prev)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isGridEnabled ? "bg-white text-ink" : "text-white hover:bg-white/10"
                    }`}
                    title="Grid Overlay"
                  >
                    <Grid className="w-4 h-4" />
                  </button>

                  {/* Beauty Mode */}
                  <button
                    onClick={() => setIsBeautyMode((prev) => !prev)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isBeautyMode ? "bg-pink-400 text-ink" : "text-white hover:bg-white/10"
                    }`}
                    title="Beauty Mode"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>

                  {/* Lens Settings */}
                  <button
                    onClick={() => setShowLensSettings(true)}
                    className="w-9 h-9 rounded-xl text-white hover:bg-white/10 flex items-center justify-center"
                    title="Lens Settings"
                  >
                    <Aperture className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ZOOM LEVEL PILLS (0.5x, 1x, 2x, 3x) */}
          <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            {(["0.5x", "1x", "2x", "3x"] as const).map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-black transition-all ${
                  zoomLevel === z ? "bg-volt text-ink shadow-md" : "text-white/70 hover:text-white"
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          {/* CAPTURE MODES & SNAPCHAT LENS CAROUSEL AREA */}
          <div className="relative z-30 pb-safe pb-4 flex flex-col items-center gap-2">
            {/* Capture Mode Selector Tabs (Photo / Video / Burst / Portrait) */}
            <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 text-xs font-bold">
              {(["photo", "video", "burst", "portrait"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setCaptureMode(mode);
                    if (mode === "portrait") setIsPortraitDepthMode(true);
                  }}
                  className={`capitalize transition-all ${
                    captureMode === mode ? "text-volt scale-105" : "text-white/60 hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Lens Category Filter Pills (Gesture Swipe Carousel) */}
            <div className="w-full px-2 py-0.5">
              <GestureSwipeCarousel
                items={LENS_CATEGORIES}
                selectedIndex={LENS_CATEGORIES.indexOf(activeCategory) >= 0 ? LENS_CATEGORIES.indexOf(activeCategory) : 0}
                onSelectIndex={(index) => {
                  setActiveCategory(LENS_CATEGORIES[index]);
                  setSelectedLensIndex(0);
                }}
                itemGap={8}
                selectedScale={1.05}
                unselectedOpacity={0.6}
                renderItem={(cat, _, isSelected) => (
                  <button
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition-all whitespace-nowrap border ${
                      isSelected
                        ? "bg-volt text-ink border-volt shadow-[0_0_15px_rgba(244,228,9,0.5)]"
                        : "bg-black/70 text-white/70 border-white/10 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                )}
              />
            </div>

            {/* Bottom Snapchat Lens Carousel (Gesture Swipe Carousel) */}
            <div className="w-full px-2 py-1">
              <GestureSwipeCarousel<LensTemplate>
                items={filteredLenses}
                selectedIndex={selectedLensIndex < filteredLenses.length ? selectedLensIndex : 0}
                onSelectIndex={setSelectedLensIndex}
                itemGap={16}
                selectedScale={1.22}
                unselectedOpacity={0.5}
                renderItem={(lens: LensTemplate, _, isSelected) => (
                  <div className="relative group py-2">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all relative ${
                          isSelected
                            ? "ring-4 ring-volt bg-surface-raised shadow-[0_0_30px_rgba(244,228,9,0.7)]"
                            : "border-2 border-white/20 bg-black/70"
                        }`}
                      >
                        {lens.icon}
                      </div>
                      <span className={`text-[11px] font-extrabold tracking-tight ${isSelected ? "text-volt drop-shadow-md" : "text-white/80"}`}>
                        {lens.name.split(" ")[0]}
                      </span>
                    </div>

                    {/* Lens Favorite Heart Toggle */}
                    <button
                      onClick={(e) => toggleFavoriteLens(lens.id, e)}
                      className={`absolute top-1 right-0 w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-md text-[10px] z-10 transition-transform active:scale-90 ${
                        lens.isFavorite ? "bg-rose-500 text-white shadow-md" : "bg-black/60 text-white/60"
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${lens.isFavorite ? "fill-white" : ""}`} />
                    </button>
                  </div>
                )}
              />
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

              {/* Stock Photos / Presets Modal Trigger */}
              <button
                onClick={() => setShowStockModal(true)}
                className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border flex items-center justify-center text-volt active:scale-95 transition-transform"
                title="Stock Backgrounds"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="bg-black/90 backdrop-blur-xl border-t border-white/10 px-screen-gutter py-3 flex justify-around items-center z-40">
        <button
          onClick={() => navigate("/home")}
          className="flex flex-col items-center text-text-secondary hover:text-white transition-colors"
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setViewMode("stories")}
          className="flex flex-col items-center text-text-secondary hover:text-white transition-colors"
        >
          <Compass className="w-6 h-6" />
          <span className="text-[10px] mt-0.5">Discover</span>
        </button>

        <button
          onClick={() => setViewMode("camera")}
          className="flex flex-col items-center text-volt transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-volt text-ink flex items-center justify-center font-black">
            <Camera className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setViewMode("memories")}
          className="flex flex-col items-center text-text-secondary hover:text-white transition-colors"
        >
          <Layers className="w-6 h-6" />
          <span className="text-[10px] mt-0.5">Community</span>
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="flex flex-col items-center text-text-secondary hover:text-white transition-colors"
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

      {/* STOCK PHOTOS MODAL SHEET */}
      <AnimatePresence>
        {showStockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-surface rounded-t-3xl hairline-border-t p-screen-gutter max-h-[80vh] overflow-y-auto space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-hairline">
                <div>
                  <h3 className="text-section-header mb-0.5">Select Photo Background</h3>
                  <p className="text-xs text-text-secondary">Curated athletic stock & presets</p>
                </div>
                <button
                  onClick={() => setShowStockModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-2">
                <GestureSwipeCarousel
                  items={["All", "Stock Running", "Cycling & Trails", "Track & Night", "Preset Gradients"]}
                  selectedIndex={["All", "Stock Running", "Cycling & Trails", "Track & Night", "Preset Gradients"].indexOf(selectedSourceCategory) >= 0 ? ["All", "Stock Running", "Cycling & Trails", "Track & Night", "Preset Gradients"].indexOf(selectedSourceCategory) : 0}
                  onSelectIndex={(index) => {
                    const categories = ["All", "Stock Running", "Cycling & Trails", "Track & Night", "Preset Gradients"];
                    setSelectedSourceCategory(categories[index]);
                  }}
                  itemGap={8}
                  selectedScale={1.05}
                  unselectedOpacity={0.6}
                  renderItem={(cat, _, isSelected) => (
                    <button
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                        isSelected
                          ? "bg-volt text-ink border-volt"
                          : "bg-surface-raised text-text-secondary border-hairline hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STOCK_PHOTOS.filter(
                  (p) => selectedSourceCategory === "All" || p.category === selectedSourceCategory
                ).map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => handleSelectStockPhoto(photo)}
                    className="relative h-32 rounded-xl overflow-hidden cursor-pointer group hairline-border hover:border-volt transition-all"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[11px] font-bold text-white">{photo.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
