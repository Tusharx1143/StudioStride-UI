/**
 * Shared admin layout — sidebar nav + top header.
 *
 * Provides navigation tabs for each content type section
 * and displays the current admin user's email.
 */

import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAdminAuth } from "../../../contexts/AdminAuthContext";
import {
  LayoutTemplate,
  Sticker,
  Image,
  Filter,
  Camera,
  PenTool,
  LogOut,
  Shield,
  Type,
  Palette,
  WandSparkles,
  Library,
  BookOpen,
  ChevronDown,
  Globe,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutTemplate;
  badge?: string;
}

const PRIMARY: NavItem[] = [
  { path: "/admin/studio", label: "Studio", icon: WandSparkles, badge: "Create" },
  { path: "/admin/library", label: "Library", icon: Library, badge: "Assets" },
  { path: "/admin/published", label: "Published", icon: Globe, badge: "Live" },
];

const ADVANCED: NavItem[] = [
  { path: "/admin/templates", label: "Templates", icon: LayoutTemplate },
  { path: "/admin/stat-designs", label: "Stat Designs", icon: PenTool },
  { path: "/admin/lenses", label: "Lenses", icon: Camera },
  { path: "/admin/stickers", label: "Stickers", icon: Sticker },
  { path: "/admin/stock-photos", label: "Stock Photos", icon: Image },
  { path: "/admin/filters", label: "Filters", icon: Filter },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, signOut } = useAdminAuth();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-ink flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-surface-raised border-r hairline-border flex flex-col">
        {/* Brand */}
        <div className="px-4 py-5 border-b hairline-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-ember" />
            <span className="text-sm font-bold text-white tracking-wide uppercase">StudioStride</span>
          </div>
          <span className="text-xs text-white/40 mt-1 block">Content Manager</span>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-ember/10 text-ember"
                    : "text-white/60 hover:text-white hover:bg-surface-overlay"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold ${active ? "bg-ember/20 text-ember" : "bg-white/5 text-white/30"}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-2 border-t hairline-border" />

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 hover:bg-surface-overlay transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-0" : "-rotate-90"}`} />
            <span className="text-[10px] uppercase tracking-wider">Advanced</span>
          </button>

          {showAdvanced && ADVANCED.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  active
                    ? "bg-ember/10 text-ember"
                    : "text-white/40 hover:text-white hover:bg-surface-overlay"
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t hairline-border space-y-2">
          <div className="text-xs text-white/40 truncate px-2">
            {adminUser?.email ?? "Not signed in"}
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger/80 hover:text-danger hover:bg-danger/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
