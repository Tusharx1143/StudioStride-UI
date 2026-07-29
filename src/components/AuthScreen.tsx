import { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, RefreshCcw, Loader2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AuthScreen() {
  const navigate = useNavigate();
  const { status, athlete, error, login } = useAuth();

  // Already authenticated — redirect straight to home
  useEffect(() => {
    if (status === "authenticated" && athlete) {
      navigate("/home", { replace: true });
    }
  }, [status, athlete, navigate]);

  const isBusy = status === "loading";

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-screen-gutter relative z-10 w-full max-w-md mx-auto min-h-screen pt-12 pb-safe bg-ink">
      {/* Background atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-ember-dim blur-[100px] opacity-20"></div>
      </div>

      <div className="flex flex-col items-center justify-center w-full space-y-section-v-rhythm text-center flex-grow z-10">
        <div className="flex flex-col items-center space-y-4">
          <ArrowLeft className="text-ember w-8 h-8" strokeWidth={2.5} />
          <h1 className="text-wordmark text-text-primary mt-2">STRIDE<br/>STUDIO</h1>
        </div>

        <p className="text-body text-text-secondary max-w-xs mx-auto">
          Every workout. Every step. Every you.
        </p>

        <div className="w-full aspect-square max-w-[280px] my-8 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl hairline-border bg-surface shadow-[0_0_40px_rgba(255,122,26,0.08)]"></div>
          <div className="relative z-10 w-24 h-24 rounded-full bg-ember-dim border-2 border-ember flex items-center justify-center">
            {isBusy ? (
              <Loader2 className="text-ember w-12 h-12 animate-spin" strokeWidth={2} />
            ) : (
              <RefreshCcw className="text-ember w-12 h-12" strokeWidth={2} />
            )}
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col items-center space-y-6 mt-8 pb-8 z-10">
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

        <button
          onClick={login}
          disabled={isBusy}
          className="w-full bg-ember text-ink rounded-full py-4 px-6 text-stat-value hover:bg-ember-press active:scale-[0.97] transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-wait"
        >
          {isBusy ? (
            <>
              <Loader2 className="text-ink w-5 h-5 animate-spin" strokeWidth={2.5} />
              <span>Checking session…</span>
            </>
          ) : (
            <>
              <span>Connect with Strava</span>
              <ArrowRight className="text-ink w-5 h-5" strokeWidth={2.5} />
            </>
          )}
        </button>

        <div className="flex flex-col items-center space-y-2 text-center">
          <p className="text-tool-caption text-text-tertiary uppercase tracking-widest">
            Powered by Strava
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
