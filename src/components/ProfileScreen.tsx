import { motion } from "motion/react";
import { Share, Settings, ChevronRight, Activity, Timer, Mountain, Flame, Home, User, Camera, FolderKanban, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfileScreen() {
  const navigate = useNavigate();

  return (
    <div className="bg-ink text-text-primary min-h-screen pb-24 md:pb-0 font-ui relative">
      <header className="flex justify-end items-center px-screen-gutter pt-12 pb-6">
        <div className="flex gap-3">
          <button onClick={() => navigate('/camera')} className="w-10 h-10 flex items-center justify-center rounded-full bg-volt text-ink transition-colors">
            <Camera className="w-5 h-5 fill-ink" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface transition-colors">
            <Share className="text-text-primary w-5 h-5" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface transition-colors">
            <Settings className="text-text-primary w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-screen-gutter max-w-2xl mx-auto">
        {/* Profile Header */}
        <section className="flex items-center gap-6 mb-8">
          <div className="relative w-24 h-24 rounded-full p-[3px] bg-volt shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-surface border-4 border-ink">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDit-KPg1Q8d1xm8TmBI5uh13_09nw2HL5_rZbG09VB_d78urxZ-CUNX4m8v2-xkkko4M-kwbSRfU1vI7ZsB2-gUBqT7yqeFMK7AswhQHewRE1Jg7B8DjjTTH_DOr_Fv3AcSd4MsrfY-Qk9CelFhBjKV3GnYZaWGqApTGwTBU9Y4ARrsX8pDudX9NyJq3Gl52u_3bGBHS-x0n7eA2CCWWfVfRkmHaRJXhhqpyUyVk_IVBzRGE55HMx2FCWg2o5447Z_PZud2EJ1gmQ"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <h1 className="text-section-header mb-1">Aarav Singh</h1>
            <p className="text-label text-text-secondary mb-3">@aarav.singh</p>
            <p className="text-body text-text-secondary text-sm leading-snug">
              Runner • Explorer • Building discipline everyday.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="flex justify-between items-center py-6 hairline-border-y mb-section-v-rhythm">
          <div className="flex flex-col items-center flex-1">
            <span className="text-stat-value text-text-primary mb-1">45</span>
            <span className="text-label text-text-secondary">Activities</span>
          </div>
          <div className="w-[1px] h-10 bg-hairline"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-stat-value text-text-primary mb-1">412 km</span>
            <span className="text-label text-text-secondary">Total Distance</span>
          </div>
          <div className="w-[1px] h-10 bg-hairline"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-stat-value text-text-primary mb-1">12</span>
            <span className="text-label text-text-secondary">Following</span>
          </div>
        </section>

        {/* This Week */}
        <section className="bg-surface rounded-lg p-5 mb-section-v-rhythm hairline-border relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-volt opacity-10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="text-label text-text-secondary mb-1">This Week</h3>
              <div className="text-metric-md text-text-primary">8.4 km</div>
            </div>
            <div className="text-right">
              <span className="text-label text-text-secondary">2 Workouts</span>
              <p className="text-stat-value text-volt">52m total</p>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-section-v-rhythm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-section-header">Recent Activity</h2>
            <button className="text-label text-volt hover:opacity-80 transition-opacity">View all</button>
          </div>

          <div className="flex flex-col gap-card-stack-gap">
            <button
              onClick={() => navigate('/editor')}
              className="bg-surface rounded-lg p-4 flex items-center hairline-border hover:bg-surface-raised transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-sm bg-volt-dim flex items-center justify-center shrink-0 mr-4">
                <Activity className="text-volt w-6 h-6" />
              </div>
              <div className="flex-grow">
                <h4 className="text-stat-value mb-1">Morning Run</h4>
                <p className="text-label text-text-secondary">8.4 km • 6:12 /km • 52:18</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-tool-caption text-text-secondary">2h ago</span>
                <ChevronRight className="text-text-secondary w-5 h-5" />
              </div>
            </button>

            <button className="bg-surface rounded-lg p-4 flex items-center hairline-border hover:bg-surface-raised transition-colors text-left">
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
          </div>
        </section>

        {/* Highlights */}
        <section className="mb-section-v-rhythm">
          <h2 className="text-section-header mb-6">Highlights</h2>
          <div className="bg-surface rounded-lg p-6 hairline-border grid grid-cols-4 gap-4">
            <div className="flex flex-col items-center text-center">
              <div className="h-10 flex items-center justify-center mb-3">
                <Activity className="text-volt w-6 h-6" />
              </div>
              <span className="text-stat-value mb-1">412 km</span>
              <span className="text-tool-caption text-text-secondary">Total Distance</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-10 flex items-center justify-center mb-3">
                <Timer className="text-volt w-6 h-6" />
              </div>
              <span className="text-stat-value mb-1">38h 45m</span>
              <span className="text-tool-caption text-text-secondary">Total Time</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-10 flex items-center justify-center mb-3">
                <Mountain className="text-volt w-6 h-6" />
              </div>
              <span className="text-stat-value mb-1">1,920 m</span>
              <span className="text-tool-caption text-text-secondary">Elev Gain</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-10 flex items-center justify-center mb-3">
                <Flame className="text-volt w-6 h-6" />
              </div>
              <span className="text-stat-value mb-1">12,340</span>
              <span className="text-tool-caption text-text-secondary">Calories</span>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full z-50 rounded-t-xl hairline-border-t bg-surface flex justify-around items-center px-4 py-3 pb-safe">
        <button onClick={() => navigate('/home')} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-text-primary transition-colors">
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => navigate('/camera')} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-volt transition-colors">
          <Camera className="w-6 h-6" />
        </button>
        <button onClick={() => navigate('/projects')} className="flex flex-col items-center justify-center text-text-secondary p-3 hover:text-volt transition-colors" title="Projects">
          <FolderKanban className="w-6 h-6" />
        </button>
        <button className="flex flex-col items-center justify-center bg-surface-raised text-volt rounded-full p-3 transition-colors">
          <User className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
