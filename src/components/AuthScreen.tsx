import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  RefreshCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHealthConnect } from "../contexts/HealthConnectContext";
import { getEnabledSources } from "../sources/registry";
import type { ActivitySourceId } from "../sources/types";

export default function AuthScreen() {
  const navigate = useNavigate();
  const { status, athlete, error, login: stravaLogin } = useAuth();
  const { state: hcState, daily: healthDaily, connect: hcConnect } = useHealthConnect();

  const isBusy = status === "loading";
  const [isConnecting, setIsConnecting] = useState(false);

  // Already authenticated with Strava — redirect
  useEffect(() => {
    if (status === "authenticated" && athlete) {
      navigate("/home", { replace: true });
    }
  }, [status, athlete, navigate]);

  // Already have Health Connect access — redirect
  useEffect(() => {
    if (hcState.available && hcState.authorized && !isBusy) {
      navigate("/home", { replace: true });
    }
  }, [hcState.available, hcState.authorized, isBusy, navigate]);

  // ── Source login handlers ─────────────────────────────────────────────

  const handleSourceConnect = async (sourceId: ActivitySourceId) => {
    setIsConnecting(true);
    switch (sourceId) {
      case "strava":
        stravaLogin();
        break;
      case "healthconnect":
        if (hcState.available && hcState.authorized) {
          navigate("/home", { replace: true });
        } else {
          await hcConnect();
        }
        break;
    }
    setIsConnecting(false);
  };

  const sources = getEnabledSources();

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-screen-gutter relative z-10 w-full max-w-md mx-auto min-h-screen pt-12 pb-safe bg-ink">
      {/* Auth loading overlay */}
      <AnimatePresence>
        {isConnecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-ink/90 backdrop-blur-md flex items-center justify-center"
          >
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 mx-auto rounded-full bg-ember-dim border-2 border-ember flex items-center justify-center mb-5">
                <Loader2 className="text-ember w-8 h-8 animate-spin" strokeWidth={2.5} />
              </div>
              <h3 className="text-section-header text-text-primary mb-2">
                {hcState.loading ? "Requesting Health Permissions…" : "Connecting to Strava…"}
              </h3>
              <p className="text-body text-text-secondary leading-relaxed">
                {hcState.loading
                  ? "This allows us to read your activity data and create workout stories."
                  : "You'll be redirected to Strava to authorize your account. Hang tight!"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-ember-dim blur-[100px] opacity-20"></div>
      </div>

      <div className="flex flex-col items-center justify-center w-full space-y-section-v-rhythm text-center flex-grow z-10">
        <div className="flex flex-col items-center space-y-4">
          <ArrowDown className="text-ember w-8 h-8" strokeWidth={2.5} />
          <h1 className="text-wordmark text-text-primary mt-2">STRIDE<br/>STUDIO</h1>
        </div>

        <p className="text-body text-text-secondary max-w-xs mx-auto">
          Every workout. Every step. Every you.
        </p>

        <div className="w-full aspect-square max-w-[280px] my-8 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl hairline-border bg-surface shadow-[0_0_40px_rgba(255,122,26,0.08)]"></div>
          <div className="relative z-10 w-24 h-24 rounded-full bg-ember-dim border-2 border-ember flex items-center justify-center">
            {isBusy || hcState.loading ? (
              <Loader2 className="text-ember w-12 h-12 animate-spin" strokeWidth={2} />
            ) : (
              <RefreshCcw className="text-ember w-12 h-12" strokeWidth={2} />
            )}
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col items-center space-y-4 mt-4 pb-8 z-10">
        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-label"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Dynamic source login buttons */}
        {sources.map((source) => {
          const isLoading =
            (source.id === "strava" && isBusy) ||
            (source.id === "healthconnect" && hcState.loading);

          const isConnected =
            (source.id === "strava" && status === "authenticated") ||
            (source.id === "healthconnect" && hcState.available && hcState.authorized);

          return (
            <button
              key={source.id}
              onClick={() => handleSourceConnect(source.id as ActivitySourceId)}
              disabled={isLoading}
              className={`w-full rounded-full py-4 px-6 text-stat-value transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-wait active:scale-[0.97] ${
                source.id === "strava"
                  ? "bg-ember text-ink hover:bg-ember-press"
                  : "bg-surface text-text-primary hover:bg-surface-raised hairline-border"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className={source.id === "strava" ? "text-ink w-5 h-5 animate-spin" : "text-ember w-5 h-5 animate-spin"} strokeWidth={2.5} />
                  <span>Connecting…</span>
                </>
              ) : isConnected ? (
                <>
                  <span>Continue with {source.label}</span>
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </>
              ) : (
                <>
                  <span>Connect with {source.label}</span>
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </>
              )}
            </button>
          );
        })}

        {/* Divider */}
        {healthDaily && (
          <>
            <div className="flex items-center gap-3 w-full pt-2">
              <div className="flex-1 h-px bg-hairline" />
              <span className="text-tool-caption text-text-tertiary">preview</span>
              <div className="flex-1 h-px bg-hairline" />
            </div>

            {/* Health summary preview */}
            <div className="w-full bg-surface rounded-xl p-4 hairline-border grid grid-cols-4 gap-3">
              <div className="flex flex-col items-center text-center">
                <span className="text-stat-value text-text-primary">
                  {healthDaily.steps.toLocaleString()}
                </span>
                <span className="text-tool-caption text-text-secondary">Steps</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-stat-value text-text-primary">
                  {healthDaily.distanceKm.toFixed(1)}
                </span>
                <span className="text-tool-caption text-text-secondary">Km</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-stat-value text-text-primary">
                  {healthDaily.heartRate.avg > 0 ? healthDaily.heartRate.avg : "--"}
                </span>
                <span className="text-tool-caption text-text-secondary">Avg HR</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-stat-value text-text-primary">
                  {healthDaily.sleepHours > 0 ? `${healthDaily.sleepHours}h` : "--"}
                </span>
                <span className="text-tool-caption text-text-secondary">Sleep</span>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex flex-col items-center space-y-2 text-center pt-2">
          <p className="text-tool-caption text-text-tertiary uppercase tracking-widest">
            Multiple ways to move
          </p>
          <div className="flex items-center space-x-2 text-tool-caption text-text-tertiary">
            <a href="#" className="hover:text-text-primary transition-colors">Terms</a>
            <span>·</span>
            <a href="#" className="hover:text-text-primary transition-colors">Privacy</a>
          </div>
        </div>
      </div>
    </main>
  );
}
