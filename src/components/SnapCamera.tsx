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
  Activity,
  Flame,
  Timer as TimerIcon,
  Mountain,
  Music,
  Heart,
  Award,
  CheckCircle2,
  Sliders,
  Send,
  Download,
  PlusCircle,
  Volume2,
  VolumeX,
  Layers,
  Check,
  Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LENS_TEMPLATES_EXPANDED, STOCK_PHOTOS } from "../data/mockData";
import { LensTemplate, PhotoSource } from "../types";

export const LENS_CATEGORIES = [
  "All",
  "Favorites",
  "Running",
  "Cycling",
  "Minimal",
  "Cyber HUD",
  "Vintage Film",
  "GPS Route",
  "PR Trophy",
  "Music Beats"
];

export default function SnapCamera() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stream & Hardware Camera Controls
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Lenses & Carousel state
  const [lenses, setLenses] = useState<LensTemplate[]>(LENS_TEMPLATES_EXPANDED);
  const [selectedLensIndex, setSelectedLensIndex] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Photo Source Picker Modal state (Stock / Presets)
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [selectedSourceCategory, setSelectedSourceCategory] = useState<string>("All");

  const filteredLenses = lenses.filter((l) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Favorites") return l.isFavorite;
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
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera access unavailable, showing fallback image:", err);
      setCameraError("Camera permissions not granted. Select a photo from stock or library!");
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
        navigate("/editor", {
          state: {
            capturedImage: imageUrl,
            selectedLensId: activeLens.id,
          },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Select stock image or gradient preset background
  const handleSelectStockPhoto = (photo: PhotoSource) => {
    setShowStockModal(false);
    navigate("/editor", {
      state: {
        capturedImage: photo.url,
        selectedLensId: activeLens.id,
      },
    });
  };

  // Execute Photo Capture (with optional timer)
  const triggerCapture = () => {
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
        canvas.width = videoRef.current.videoWidth || 720;
        canvas.height = videoRef.current.videoHeight || 1280;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (facingMode === "user") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          imageUrl = canvas.toDataURL("image/jpeg", 0.92);
        }
      }

      setIsCapturing(false);
      navigate("/editor", {
        state: {
          capturedImage: imageUrl,
          selectedLensId: activeLens.id,
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
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          >
            <span className="text-8xl font-black text-volt drop-shadow-[0_0_30px_rgba(244,228,9,0.8)]">
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewfinder Canvas */}
      <div className="relative flex-1 w-full h-full bg-surface flex flex-col justify-between overflow-hidden">
        {/* Live Video Stream or Fallback Image */}
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
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{ backgroundImage: `url("${STOCK_PHOTOS[1].url}")` }}
          ></div>
        )}

        {/* Dark Scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none"></div>

        {/* Dynamic Lens Live Graphic Overlay */}
        <div className="absolute inset-0 z-10 p-screen-gutter pt-20 pb-40 flex flex-col justify-between pointer-events-none">
          {/* Active Lens Badge */}
          <div className="self-start flex items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold shadow-lg flex items-center gap-1.5 backdrop-blur-md ${activeLens.badgeColor}`}
            >
              <span>{activeLens.icon}</span>
              <span>{activeLens.name} Lens</span>
            </span>
          </div>

          {/* Lens Specific Live Stats Preview */}
          <div className="w-full max-w-sm">
            {activeLens.overlayType === "minimal" && (
              <div className="space-y-3 drop-shadow-2xl">
                <div className="flex items-baseline gap-2">
                  <span className="text-metric-xl text-white font-extrabold tracking-tighter drop-shadow-md">
                    8.42
                  </span>
                  <span className="text-metric-md text-white font-bold">km</span>
                </div>
                <div className="flex gap-2">
                  <div className="bg-black/60 backdrop-blur-md hairline-border rounded-lg px-3 py-2">
                    <div className="text-[11px] text-text-secondary">Pace</div>
                    <div className="text-stat-value text-volt">6:12 /km</div>
                  </div>
                  <div className="bg-black/60 backdrop-blur-md hairline-border rounded-lg px-3 py-2">
                    <div className="text-[11px] text-text-secondary">Time</div>
                    <div className="text-stat-value text-white">52:18</div>
                  </div>
                </div>
              </div>
            )}

            {activeLens.overlayType === "strava" && (
              <div className="bg-[#FC4C02]/90 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md border border-white/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-200">
                    STRAVA RUN ⚡
                  </span>
                  <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                    GPS TRACKED
                  </span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight">8.42 KM</div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center border-t border-white/20 pt-2 text-xs">
                  <div>
                    <div className="opacity-80">Pace</div>
                    <div className="font-bold">6:12</div>
                  </div>
                  <div>
                    <div className="opacity-80">Elev Gain</div>
                    <div className="font-bold">+142m</div>
                  </div>
                  <div>
                    <div className="opacity-80">Calories</div>
                    <div className="font-bold">640</div>
                  </div>
                </div>
              </div>
            )}

            {activeLens.overlayType === "cyberpunk" && (
              <div className="border-2 border-cyan-400 bg-black/80 text-cyan-300 p-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] font-mono">
                <div className="flex justify-between items-center text-xs mb-2 border-b border-cyan-400/40 pb-1">
                  <span>[ HUD ACTIVE ]</span>
                  <span className="animate-pulse text-red-400">● LIVE</span>
                </div>
                <div className="text-4xl font-black text-white tracking-widest">
                  08.40 <span className="text-cyan-400 text-lg">KM</span>
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <div>HR: <span className="text-white font-bold">154 BPM</span></div>
                  <div>CADENCE: <span className="text-white font-bold">168 SPM</span></div>
                </div>
              </div>
            )}

            {activeLens.overlayType === "vintage" && (
              <div className="bg-amber-50/90 text-zinc-900 p-4 rounded-xl shadow-2xl font-serif rotate-[-1deg] border border-amber-200">
                <div className="text-xs text-zinc-600 tracking-wider mb-1">
                  JUL 27, 2026 — 06:42 AM
                </div>
                <div className="text-3xl font-bold tracking-tight">8.4 kilometers</div>
                <div className="text-sm italic text-zinc-700 mt-1">
                  "Morning miles before sunrise"
                </div>
              </div>
            )}

            {activeLens.overlayType === "route" && (
              <div className="bg-black/70 backdrop-blur-md p-4 rounded-xl hairline-border text-white">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2">
                  <span>GPS ELEVATION PROFILE</span>
                  <span>+142m PEAK</span>
                </div>
                <svg className="w-full h-12 text-emerald-400" viewBox="0 0 200 40">
                  <path
                    d="M 0 35 Q 30 10, 60 25 T 120 15 T 170 30 L 200 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="200" cy="10" r="4" fill="#F4E409" />
                </svg>
                <div className="flex justify-between text-xs mt-1 text-text-secondary">
                  <span>Start: Golden Gate</span>
                  <span>8.42 km • 52:18</span>
                </div>
              </div>
            )}

            {activeLens.overlayType === "trophy" && (
              <div className="bg-gradient-to-r from-yellow-500/90 to-amber-600/90 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl shrink-0">
                  🏆
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-yellow-200">
                    NEW PR RECORD!
                  </div>
                  <div className="text-lg font-extrabold">Fastest 5K & 8.4KM Run</div>
                  <div className="text-xs opacity-90">Beat record by 1m 42s</div>
                </div>
              </div>
            )}

            {activeLens.overlayType === "music" && (
              <div className="bg-black/80 backdrop-blur-md border border-pink-500/40 text-white p-3.5 rounded-full flex items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Run Boy Run</div>
                    <div className="text-[11px] text-pink-300">Woodkid • Workout Anthems</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-4 bg-pink-400 animate-pulse rounded-full"></span>
                  <span className="w-1 h-6 bg-pink-500 animate-pulse delay-75 rounded-full"></span>
                  <span className="w-1 h-3 bg-pink-300 animate-pulse delay-150 rounded-full"></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Header Actions Bar */}
        <div className="relative z-20 flex justify-between items-center p-screen-gutter pt-8">
          <button
            onClick={() => navigate("/home")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md hairline-border text-white active:scale-95 transition-transform"
            title="Back to Home"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            {/* Timer Toggle */}
            <button
              onClick={() =>
                setTimerSeconds((prev) => (prev === 0 ? 3 : prev === 3 ? 5 : 0))
              }
              className={`h-10 px-3 rounded-full backdrop-blur-md hairline-border flex items-center gap-1.5 transition-all ${
                timerSeconds > 0 ? "bg-volt text-ink font-bold" : "bg-black/50 text-white"
              }`}
              title="Camera Timer"
            >
              <TimerIcon className="w-4 h-4" />
              <span className="text-xs">{timerSeconds > 0 ? `${timerSeconds}s` : "Off"}</span>
            </button>

            {/* Flash Toggle */}
            <button
              onClick={() =>
                setFlash((prev) => (prev === "off" ? "on" : prev === "on" ? "auto" : "off"))
              }
              className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md hairline-border transition-all ${
                flash !== "off" ? "bg-volt text-ink font-bold" : "bg-black/50 text-white"
              }`}
              title="Flash"
            >
              {flash === "on" ? (
                <Zap className="w-5 h-5 fill-ink" />
              ) : (
                <ZapOff className="w-5 h-5" />
              )}
            </button>

            {/* Switch Camera */}
            <button
              onClick={toggleCameraFacing}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md hairline-border text-white active:scale-95 transition-transform"
              title="Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Controls & Snapchat Lens Carousel */}
        <div className="relative z-20 pb-safe pb-6 flex flex-col items-center gap-3">
          {/* Camera Access Warning */}
          {cameraError && (
            <div className="bg-black/80 text-amber-300 text-xs px-4 py-2 rounded-full border border-amber-500/40 backdrop-blur-md max-w-xs text-center mb-1">
              {cameraError}
            </div>
          )}

          {/* Lens Category Filter Tabs */}
          <div className="w-full px-4 overflow-x-auto no-scrollbar flex items-center justify-center gap-1.5">
            {LENS_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedLensIndex(0);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-volt text-ink shadow-md"
                    : "bg-black/60 text-text-secondary hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Snapchat Lens Carousel */}
          <div className="w-full px-4 overflow-x-auto no-scrollbar flex items-center justify-center gap-3 py-1">
            {filteredLenses.map((lens, index) => {
              const isSelected = index === selectedLensIndex;
              return (
                <div key={lens.id} className="relative shrink-0 group">
                  <button
                    onClick={() => setSelectedLensIndex(index)}
                    className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                      isSelected ? "scale-110 opacity-100" : "scale-90 opacity-60 hover:opacity-90"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all relative ${
                        isSelected
                          ? "ring-4 ring-volt bg-surface-raised shadow-[0_0_20px_rgba(244,228,9,0.5)]"
                          : "border border-hairline bg-black/60"
                      }`}
                    >
                      {lens.icon}
                    </div>
                    <span className="text-[10px] font-bold text-white tracking-tight">
                      {lens.name.split(" ")[0]}
                    </span>
                  </button>

                  {/* Lens Favorite Heart Toggle */}
                  <button
                    onClick={(e) => toggleFavoriteLens(lens.id, e)}
                    className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-md text-[10px] ${
                      lens.isFavorite ? "bg-rose-500 text-white" : "bg-black/60 text-white/60"
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${lens.isFavorite ? "fill-white" : ""}`} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Shutter Button & Image Source Pickers Bar */}
          <div className="w-full px-screen-gutter flex items-center justify-between max-w-xs">
            {/* Local Gallery File Input */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border flex items-center justify-center text-white active:scale-95 transition-transform"
              title="Upload from gallery"
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

            {/* Snapchat Main Outer Shutter Ring */}
            <button
              onClick={triggerCapture}
              disabled={isCapturing}
              className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-white hover:bg-volt transition-colors flex items-center justify-center">
                {isCapturing && (
                  <div className="w-full h-full rounded-full bg-volt animate-ping"></div>
                )}
              </div>
            </button>

            {/* Stock / Presets Backgrounds Modal Trigger */}
            <button
              onClick={() => setShowStockModal(true)}
              className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border flex items-center justify-center text-volt active:scale-95 transition-transform"
              title="Stock photos & presets"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stock Photos & Preset Backgrounds Modal Sheet */}
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

              {/* Photo Categories */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {["All", "Stock Running", "Cycling & Trails", "Track & Night", "Preset Gradients"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedSourceCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedSourceCategory === cat
                        ? "bg-volt text-ink"
                        : "bg-surface-raised text-text-secondary hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Photo Grid */}
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
