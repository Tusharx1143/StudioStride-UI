import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuthScreen() {
  const navigate = useNavigate();

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
            <RefreshCcw className="text-ember w-12 h-12" strokeWidth={2} />
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col items-center space-y-6 mt-8 pb-8 z-10">
        <button
          onClick={() => navigate('/home')}
          className="w-full bg-ember text-ink rounded-full py-4 px-6 text-stat-value hover:bg-ember-press active:scale-[0.97] transition-all flex items-center justify-center space-x-2"
        >
          <span>Connect with Strava</span>
          <ArrowRight className="text-ink w-5 h-5" strokeWidth={2.5} />
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
