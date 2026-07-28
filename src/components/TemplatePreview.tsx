import { TemplateFamily } from "../types";

interface TemplatePreviewProps {
  template: TemplateFamily;
  distance: number;
  distanceUnit: string;
  pace: string;
  time: string;
  title: string;
}

export default function TemplatePreview({
  template,
  distance,
  distanceUnit,
  pace,
  time,
  title,
}: TemplatePreviewProps) {
  switch (template.id) {
    // ── Hero ──────────────────────────────────────────────
    case "hero":
      return (
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black text-white tracking-tighter drop-shadow-xl" style={{ fontFamily: "'Archivo', sans-serif" }}>
              {distance.toFixed(2)}
            </span>
            <span className="text-xl text-volt font-bold">{distanceUnit}</span>
          </div>
          <div className="text-xs text-white/60 font-semibold uppercase tracking-widest">{title}</div>
        </div>
      );

    // ── Editorial ──────────────────────────────────────────
    case "editorial":
      return (
        <div className="space-y-3 max-w-[220px]">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 border-b border-white/20 pb-1">
            Activity Report
          </div>
          <div className="text-4xl font-serif italic text-white leading-none">{title}</div>
          <div className="flex gap-3 text-xs">
            <span className="text-white font-bold">{distance.toFixed(1)}<span className="text-white/50 ml-0.5">{distanceUnit}</span></span>
            <span className="text-white/30">·</span>
            <span className="text-white font-bold">{pace}</span>
            <span className="text-white/30">·</span>
            <span className="text-white font-bold">{time}</span>
          </div>
        </div>
      );

    // ── Minimal ────────────────────────────────────────────
    case "minimal":
      return (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">{distance.toFixed(2)}</span>
            <span className="text-lg text-volt font-bold">{distanceUnit}</span>
          </div>
          <div className="flex gap-2">
            <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-white border border-white/10">
              Pace <span className="text-volt font-bold">{pace}</span>
            </div>
            <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-white border border-white/10">
              Time <span className="font-bold">{time}</span>
            </div>
          </div>
        </div>
      );

    // ── Sports ─────────────────────────────────────────────
    case "sports":
      return (
        <div className="space-y-2" style={{ transform: "skewX(-4deg)" }}>
          <div className="bg-[#FF4D3D] text-white inline-block px-4 py-2 rounded-r-lg shadow-xl">
            <span className="text-3xl font-black tracking-tighter">{distance.toFixed(1)}</span>
            <span className="text-sm font-bold ml-1">{distanceUnit}</span>
          </div>
          <div className="flex gap-3 text-xs font-black uppercase tracking-wider">
            <span className="text-white bg-black/70 px-2 py-1 rounded">{pace}</span>
            <span className="text-white bg-black/70 px-2 py-1 rounded">{time}</span>
          </div>
        </div>
      );

    // ── Glass ──────────────────────────────────────────────
    case "glass":
      return (
        <div className="space-y-2">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 shadow-xl" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <div className="text-4xl font-black text-white tracking-tight">{distance.toFixed(2)} <span className="text-lg text-white/60">{distanceUnit}</span></div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-white/70 font-medium bg-white/10 rounded-full px-3 py-1">{pace}</span>
              <span className="text-xs text-white/70 font-medium bg-white/10 rounded-full px-3 py-1">{time}</span>
            </div>
          </div>
        </div>
      );

    // ── Terminal ───────────────────────────────────────────
    case "terminal":
      return (
        <div className="font-mono space-y-0.5" style={{ fontFamily: "'Courier New', monospace" }}>
          <div className="text-[10px] text-[#22D3EE]/70">$ activity --export --format=card</div>
          <div className="text-3xl font-black text-[#22D3EE]" style={{ textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>
            {String(distance.toFixed(2)).padStart(5, "0")} <span className="text-sm">{distanceUnit.toUpperCase()}</span>
          </div>
          <div className="flex gap-4 text-[11px] text-[#22D3EE]/80">
            <span>pace={pace}</span>
            <span>time={time}</span>
          </div>
          <div className="text-[10px] text-[#22D3EE]/50 animate-pulse">▌</div>
        </div>
      );

    // ── Digital ────────────────────────────────────────────
    case "digital":
      return (
        <div className="space-y-2" style={{ fontFamily: "'Courier New', monospace" }}>
          <div className="bg-[#0a1a0a] border-2 border-[#10B981]/30 rounded-xl p-3 inline-block">
            <div className="text-[10px] text-[#10B981]/60 uppercase tracking-widest mb-1">Distance</div>
            <div className="text-4xl font-black text-[#10B981]" style={{ textShadow: "0 0 15px rgba(16,185,129,0.4)" }}>
              {String(distance.toFixed(2)).padStart(5, "0")}
            </div>
          </div>
          <div className="flex gap-1.5 text-[10px] text-[#10B981]/70 font-mono">
            <span className="bg-[#0a1a0a] px-2 py-0.5 rounded border border-[#10B981]/20">{pace}/km</span>
            <span className="bg-[#0a1a0a] px-2 py-0.5 rounded border border-[#10B981]/20">{time}</span>
          </div>
        </div>
      );

    // ── Achievement ────────────────────────────────────────
    case "achievement":
      return (
        <div className="space-y-1 text-center">
          <div className="text-3xl mb-1">🏆</div>
          <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-xl px-5 py-3 shadow-xl font-black text-center">
            <div className="text-[10px] uppercase tracking-widest opacity-70 mb-0.5">Achievement Unlocked</div>
            <div className="text-3xl">{distance.toFixed(1)} {distanceUnit}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{title} · {time}</div>
          </div>
        </div>
      );

    // ── Route ──────────────────────────────────────────────
    case "route":
      return (
        <div className="space-y-2">
          <div className="bg-[#1e3a5f]/90 border border-[#3B82F6]/30 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs">📍</span>
              <span className="text-[10px] text-[#60A5FA] font-bold uppercase tracking-wider">{title}</span>
            </div>
            <div className="text-3xl font-black text-white">{distance.toFixed(2)} <span className="text-sm text-[#60A5FA]">{distanceUnit}</span></div>
            <div className="flex gap-2 mt-1.5 text-[10px] text-[#93C5FD] font-medium">
              <span>⏱ {pace}</span>
              <span>🕐 {time}</span>
            </div>
          </div>
        </div>
      );

    // ── Race ───────────────────────────────────────────────
    case "race":
      return (
        <div className="space-y-1">
          <div className="flex items-end gap-1">
            <span className="text-5xl font-black text-white italic tracking-tighter">{distance.toFixed(1)}</span>
            <span className="text-lg text-[#EF4444] font-bold mb-1">{distanceUnit}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white bg-[#EF4444] px-2 py-0.5 rounded">#{pace}</span>
            <span className="text-xs font-bold text-white/70">LAP TIME {time}</span>
          </div>
          <div className="flex gap-1 mt-0.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-6 h-1 rounded-full bg-white/20">
                <div className="h-full rounded-full bg-[#EF4444]" style={{ width: `${(i + 1) * 18}%` }} />
              </div>
            ))}
          </div>
        </div>
      );

    // ── Polaroid ───────────────────────────────────────────
    case "polaroid":
      return (
        <div className="bg-[#f5f0e8] text-zinc-800 p-3 rounded-sm shadow-2xl inline-block rotate-[-2deg]" style={{ boxShadow: "4px 6px 20px rgba(0,0,0,0.4)" }}>
          <div className="text-[9px] text-zinc-500 font-medium mb-1">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</div>
          <div className="text-2xl font-bold font-serif">{distance.toFixed(1)} km</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-medium">{pace} · {time}</div>
        </div>
      );

    // ── Magazine ───────────────────────────────────────────
    case "magazine":
      return (
        <div className="space-y-1 max-w-[200px]">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#EC4899]">{title}</div>
          <div className="text-5xl font-black text-white leading-none italic" style={{ fontFamily: "'Playfair Display', serif" }}>
            {distance.toFixed(1)}<span className="text-xl text-[#EC4899]">{distanceUnit}</span>
          </div>
          <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">{pace} / {time}</div>
        </div>
      );

    // ── Quote ──────────────────────────────────────────────
    case "quote":
      return (
        <div className="space-y-2 max-w-[220px]">
          <div className="text-4xl text-[#A78BFA] leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>"</div>
          <div className="text-xl font-medium italic text-white leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>
            {distance.toFixed(1)} kilometers of pure momentum
          </div>
          <div className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider">— {title} · {time}</div>
        </div>
      );

    // ── Calendar ───────────────────────────────────────────
    case "calendar":
      return (
        <div className="bg-black/70 border border-[#FB923C]/30 rounded-2xl p-3 backdrop-blur-sm">
          <div className="text-[10px] text-[#FB923C] font-black uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>
          <div className="text-3xl font-black text-white">{distance.toFixed(1)} <span className="text-sm text-[#FB923C]">{distanceUnit}</span></div>
          <div className="flex gap-3 mt-1.5 text-[11px] text-white/70 font-semibold">
            <span>{pace}</span>
            <span>{time}</span>
          </div>
        </div>
      );

    // ── Weekly ─────────────────────────────────────────────
    case "weekly":
      return (
        <div className="space-y-2">
          <div className="text-[10px] text-[#34D399] font-black uppercase tracking-widest">This Week</div>
          <div className="bg-black/60 rounded-xl p-3 border border-[#34D399]/20">
            <div className="text-3xl font-black text-white">{distance.toFixed(1)} <span className="text-sm text-[#34D399]">{distanceUnit}</span></div>
            <div className="flex gap-3 mt-1.5">
              {[0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.6].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-white/10 rounded-full h-10 relative overflow-hidden">
                    <div className="absolute bottom-0 w-full rounded-full bg-[#34D399]" style={{ height: `${h * 100}%` }} />
                  </div>
                  <span className="text-[8px] text-white/40">{["M","T","W","T","F","S","S"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    // ── Monthly ────────────────────────────────────────────
    case "monthly":
      return (
        <div className="bg-black/60 rounded-2xl p-3 border border-[#60A5FA]/20 backdrop-blur-sm">
          <div className="text-[9px] text-[#60A5FA] font-black uppercase tracking-[0.2em] mb-1">Monthly Progress</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{distance.toFixed(1)}</span>
            <span className="text-sm text-[#60A5FA] font-bold">{distanceUnit}</span>
          </div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#60A5FA] to-[#34D399] rounded-full" style={{ width: "78%" }} />
          </div>
          <div className="text-[10px] text-white/50 mt-1 font-medium">78% of monthly goal</div>
        </div>
      );

    // ── Modern ─────────────────────────────────────────────
    case "modern":
      return (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-white/20 pb-1">
            <span className="text-4xl font-black text-white tracking-tight">{distance.toFixed(2)}</span>
            <span className="text-sm text-white/40 font-medium uppercase tracking-wider">{distanceUnit}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div><span className="text-white/40 block">Pace</span><span className="text-white font-bold">{pace}</span></div>
            <div><span className="text-white/40 block">Time</span><span className="text-white font-bold">{time}</span></div>
          </div>
        </div>
      );

    // ── Luxury ─────────────────────────────────────────────
    case "luxury":
      return (
        <div className="space-y-1" style={{ fontFamily: "'Playfair Display', serif" }}>
          <div className="text-[8px] text-[#D4AF37]/80 uppercase tracking-[0.3em] font-sans mb-1">Performance</div>
          <div className="text-5xl font-bold text-[#D4AF37] italic" style={{ textShadow: "0 2px 12px rgba(212,175,55,0.3)" }}>
            {distance.toFixed(1)}
          </div>
          <div className="text-xs text-[#D4AF37]/60 uppercase tracking-wider">{distanceUnit} · {pace} · {time}</div>
        </div>
      );

    // ── Experimental ───────────────────────────────────────
    case "experimental":
      return (
        <div className="space-y-1" style={{ transform: "rotate(-3deg)" }}>
          <div className="text-[10px] text-[#F472B6] font-bold uppercase tracking-[0.15em] opacity-70">{title}</div>
          <div className="text-5xl font-black text-white" style={{ mixBlendMode: "difference" as any }}>
            {distance.toFixed(1)}<span className="text-xl text-[#F472B6] ml-1">{distanceUnit}</span>
          </div>
          <div className="flex gap-3 text-[10px] text-[#F472B6]/70">
            <span className="line-through">{pace}</span>
            <span className="line-through">{time}</span>
          </div>
        </div>
      );

    // ── Brutalist ──────────────────────────────────────────
    case "brutalist":
      return (
        <div className="space-y-2">
          <div className="bg-[#78716C] text-white px-4 py-2" style={{ boxShadow: "6px 6px 0px rgba(0,0,0,0.5)" }}>
            <div className="text-[9px] font-black uppercase tracking-widest opacity-70">{title}</div>
            <div className="text-3xl font-black">{distance.toFixed(2)} <span className="text-sm">{distanceUnit}</span></div>
          </div>
          <div className="flex gap-0">
            <span className="bg-white text-black px-2 py-0.5 text-[10px] font-black">{pace}</span>
            <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black border border-white">{time}</span>
          </div>
        </div>
      );

    // ── Cyberpunk ──────────────────────────────────────────
    case "cyberpunk":
      return (
        <div className="space-y-1" style={{ fontFamily: "'Courier New', monospace" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] text-[#06B6D4] font-black uppercase tracking-widest">[ HUD v2.4 ]</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-4xl font-black text-[#22D3EE]" style={{ textShadow: "0 0 30px rgba(6,182,212,0.6)" }}>
            {String(distance.toFixed(2)).padStart(5, "0")} <span className="text-sm">{distanceUnit.toUpperCase()}</span>
          </div>
          <div className="flex gap-3 text-[10px] text-[#06B6D4]/80">
            <span>⚡ {pace}</span>
            <span>⏳ {time}</span>
          </div>
          <div className="h-1 bg-[#06B6D4]/20 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#06B6D4] rounded-full animate-pulse" style={{ width: "60%", boxShadow: "0 0 10px #06B6D4" }} />
          </div>
        </div>
      );

    // ── Apple ──────────────────────────────────────────────
    case "apple":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <svg width="56" height="56" viewBox="0 0 56 56" className="drop-shadow-lg">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#FF4D3D" strokeWidth="5" strokeDasharray="151" strokeDashoffset="30" strokeLinecap="round" />
              <circle cx="28" cy="28" r="18" fill="none" stroke="#34D399" strokeWidth="5" strokeDasharray="113" strokeDashoffset="20" strokeLinecap="round" />
              <circle cx="28" cy="28" r="12" fill="none" stroke="#60A5FA" strokeWidth="5" strokeDasharray="75" strokeDashoffset="10" strokeLinecap="round" />
            </svg>
            <div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Today</div>
              <div className="text-2xl font-black text-white">{distance.toFixed(1)} <span className="text-sm text-white/50">{distanceUnit}</span></div>
              <div className="text-[10px] text-white/40">{pace} · {time}</div>
            </div>
          </div>
        </div>
      );

    // ── Nothing ────────────────────────────────────────────
    case "nothing":
      return (
        <div className="space-y-2" style={{ fontFamily: "monospace" }}>
          <div className="text-[10px] text-[#EF4444] uppercase tracking-[0.2em] font-bold">· activity ·</div>
          <div className="bg-black/80 border border-white/10 rounded-2xl p-3">
            <div className="text-3xl font-light text-white tracking-tighter">
              {distance.toFixed(2)}<span className="text-sm text-[#EF4444] ml-1">{distanceUnit}</span>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              <span className="text-[10px] text-white/50 font-medium">{pace}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="text-[10px] text-white/50 font-medium">{time}</span>
            </div>
          </div>
        </div>
      );

    // ── Canva ──────────────────────────────────────────────
    case "canva":
      return (
        <div className="space-y-2">
          <div className="bg-[#8B5CF6] rounded-2xl p-4 shadow-xl" style={{ boxShadow: "0 8px 30px rgba(139,92,246,0.3)" }}>
            <div className="text-4xl font-black text-white">{distance.toFixed(1)} <span className="text-lg">{distanceUnit}</span></div>
            <div className="flex gap-1.5 mt-2">
              <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{pace}</span>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{time}</span>
            </div>
          </div>
          <div className="text-[10px] text-[#8B5CF6] font-bold text-center">✨ {title} ✨</div>
        </div>
      );

    // ── Pinterest ──────────────────────────────────────────
    case "pinterest":
      return (
        <div className="space-y-2">
          <div className="bg-white rounded-2xl p-4 shadow-2xl" style={{ boxShadow: "4px 6px 20px rgba(0,0,0,0.4)" }}>
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">{title}</div>
            <div className="text-4xl font-black text-zinc-900">{distance.toFixed(1)} <span className="text-sm text-zinc-500">{distanceUnit}</span></div>
            <div className="text-[11px] text-[#E60023] font-bold mt-1.5">📌 Save to board</div>
          </div>
          <div className="flex gap-2">
            <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] text-white font-medium">{pace}</span>
            <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] text-white font-medium">{time}</span>
          </div>
        </div>
      );

    // ── Gradient ───────────────────────────────────────────
    case "gradient":
      return (
        <div className="space-y-2">
          <div
            className="rounded-2xl p-4"
            style={{ background: "linear-gradient(135deg, #F4E409, #FF4D3D, #8B5CF6, #06B6D4)", boxShadow: "0 12px 40px rgba(139,92,246,0.3)" }}
          >
            <div className="text-4xl font-black text-white drop-shadow-lg">{distance.toFixed(1)} <span className="text-lg">{distanceUnit}</span></div>
            <div className="flex gap-2 mt-2">
              <span className="bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] text-white font-bold">{pace}</span>
              <span className="bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] text-white font-bold">{time}</span>
            </div>
          </div>
        </div>
      );

    // ── Motion ─────────────────────────────────────────────
    case "motion":
      return (
        <div className="space-y-2">
          <div className="text-5xl font-black text-volt italic tracking-tighter" style={{
            filter: "blur(0.5px)",
            textShadow: "0 0 30px rgba(244,228,9,0.6), 4px 4px 0px rgba(244,228,9,0.2)",
          }}>
            {distance.toFixed(2)}
          </div>
          <div className="text-xs text-volt/70 font-bold">
            {distanceUnit} · {pace} · {time}
          </div>
        </div>
      );

    // ── Vintage ────────────────────────────────────────────
    case "vintage":
      return (
        <div className="space-y-1">
          <div className="bg-amber-50/95 text-zinc-900 p-3 rounded-lg shadow-xl" style={{ fontFamily: "'Playfair Display', serif", transform: "rotate(-1deg)" }}>
            <div className="text-[9px] text-zinc-500 tracking-wider font-medium">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).toUpperCase()}
            </div>
            <div className="text-2xl font-bold mt-0.5">{distance.toFixed(1)} kilometers</div>
            <div className="text-[10px] text-zinc-500 mt-1 italic">{pace} · {time}</div>
          </div>
          <div className="flex gap-1">
            {[0.2, 0.4, 0.3, 0.5].map((s, i) => (
              <div key={i} className="h-0.5 flex-1 rounded-full bg-amber-200/50" style={{ opacity: s }} />
            ))}
          </div>
        </div>
      );

    // ── Default / fallback ─────────────────────────────────
    default:
      return (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tighter">{distance.toFixed(2)}</span>
            <span className="text-lg text-volt font-bold">{distanceUnit}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-xs text-white/70">{pace}</span>
            <span className="text-xs text-white/70">{time}</span>
          </div>
        </div>
      );
  }
}
