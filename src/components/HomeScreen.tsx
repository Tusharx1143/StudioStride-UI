import { motion } from "motion/react";
import { Activity, Target, ChevronRight, Share, User, Home, Plus, Camera, Sparkles, FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="bg-ink text-text-primary min-h-screen pb-24 md:pb-0 font-ui relative">
      <header className="px-screen-gutter pt-12 pb-6 flex justify-between items-center">
        <h1 className="text-wordmark text-[32px] leading-none tracking-tighter">STRIDE</h1>
        <button
          onClick={() => navigate('/camera')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-raised transition-colors"
          title="Create New Story"
        >
          <Plus className="text-text-primary w-5 h-5" />
        </button>
      </header>

      <main className="px-screen-gutter max-w-2xl mx-auto">
        {/* Featured Activity */}
        <section className="mb-section-v-rhythm relative">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-section-header">Ready to share</h2>
          </div>

          <div className="relative group cursor-pointer" onClick={() => navigate('/camera')}>
            {/* Volt bloom effect */}
            <div className="absolute inset-0 bg-volt opacity-20 blur-2xl rounded-2xl group-hover:opacity-30 transition-opacity"></div>
            
            <div className="bg-surface relative z-10 rounded-xl p-5 hairline-border shadow-[0_0_40px_rgba(244,228,9,0.12)]">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-sm bg-volt flex items-center justify-center shrink-0">
                  <Activity className="text-ink w-6 h-6" />
                </div>
                <span className="text-tool-caption text-text-secondary bg-surface-raised px-3 py-1 rounded-full hairline-border">
                  2h ago
                </span>
              </div>
              
              <div className="mb-4">
                <h3 className="text-screen-title mb-1">Morning Run</h3>
                <p className="text-body text-text-secondary">Golden Gate Park</p>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-metric-md">8.4<span className="text-stat-value text-text-secondary ml-1">km</span></span>
                </div>
                <div className="w-[1px] bg-hairline"></div>
                <div className="flex flex-col justify-center">
                  <span className="text-stat-value">52:18</span>
                  <span className="text-label text-text-secondary mt-0.5">Time</span>
                </div>
                <div className="w-[1px] bg-hairline"></div>
                <div className="flex flex-col justify-center">
                  <span className="text-stat-value">6:12</span>
                  <span className="text-label text-text-secondary mt-0.5">Pace</span>
                </div>
              </div>

              <div className="mt-6 pt-4 hairline-border-t flex items-center justify-between text-volt">
                <span className="text-stat-value flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Create Story for Run
                </span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </section>

        {/* Previous Activities */}
        <section className="mb-section-v-rhythm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-section-header">Previous</h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs text-text-secondary hover:text-volt transition-colors flex items-center gap-1"
            >
              Saved Projects <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="flex flex-col gap-card-stack-gap">
            <button
              onClick={() => navigate('/projects')}
              className="bg-surface rounded-lg p-4 flex items-center hairline-border hover:bg-surface-raised transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-sm bg-volt-dim flex items-center justify-center shrink-0 mr-4">
                <Target className="text-volt w-6 h-6" />
              </div>
              <div className="flex-grow">
                <h4 className="text-stat-value mb-1">Cycling</h4>
                <p className="text-label text-text-secondary">35.2 km • 2:59 /km • 1:45:32</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-tool-caption text-text-secondary">Yesterday</span>
                <ChevronRight className="text-text-secondary w-5 h-5" />
              </div>
            </button>

            <button
              onClick={() => navigate('/projects')}
              className="bg-surface rounded-lg p-4 flex items-center hairline-border hover:bg-surface-raised transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-sm bg-volt-dim flex items-center justify-center shrink-0 mr-4">
                <Activity className="text-volt w-6 h-6" />
              </div>
              <div className="flex-grow">
                <h4 className="text-stat-value mb-1">Evening Walk</h4>
                <p className="text-label text-text-secondary">6.1 km • 7:54 /km • 48:12</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-tool-caption text-text-secondary">2 days ago</span>
                <ChevronRight className="text-text-secondary w-5 h-5" />
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full z-50 rounded-t-xl hairline-border-t bg-surface flex justify-around items-center px-4 py-3 pb-safe">
        <button className="flex flex-col items-center justify-center bg-surface-raised text-volt rounded-full p-3 transition-colors">
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => navigate('/camera')} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-volt transition-colors">
          <Camera className="w-6 h-6" />
        </button>
        <button onClick={() => navigate('/projects')} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-volt transition-colors" title="Projects">
          <FolderKanban className="w-6 h-6" />
        </button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-text-primary transition-colors">
          <User className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
