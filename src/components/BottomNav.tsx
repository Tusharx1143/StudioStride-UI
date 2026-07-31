import { motion } from "motion/react";
import { Home, Camera, FolderKanban, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * The app's primary navigation.
 *
 * Previously copy-pasted into HomeScreen, ProjectsScreen, and ProfileScreen —
 * three copies of the same ~20 lines, each hand-setting its own `aria-current`
 * and its own active-state classes.
 *
 * Two behaviours changed in the process:
 *
 * - It no longer animates in on every navigation. Each copy carried
 *   `delay: 0.2` on a slide-up, so the bar re-entered from below every time
 *   you switched tabs. It is persistent chrome; it should not re-announce
 *   itself.
 * - The active pill is a shared `layoutId`, so it slides between tabs instead
 *   of cutting. That is what makes four screens read as one surface.
 */

export type NavTab = "home" | "create" | "projects" | "profile";

interface NavItem {
  id: NavTab;
  label: string;
  path: string;
  Icon: typeof Home;
}

const ITEMS: NavItem[] = [
  { id: "home", label: "Home", path: "/home", Icon: Home },
  { id: "create", label: "Create", path: "/editor", Icon: Camera },
  { id: "projects", label: "Projects", path: "/projects", Icon: FolderKanban },
  { id: "profile", label: "Profile", path: "/profile", Icon: User },
];

interface BottomNavProps {
  active: NavTab;
}

export default function BottomNav({ active }: BottomNavProps) {
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 w-full z-50 rounded-t-xl hairline-border-t bg-surface flex justify-around items-center px-4 py-2 pb-safe"
      aria-label="Main navigation"
    >
      {ITEMS.map(({ id, label, path, Icon }) => {
        const isActive = id === active;

        return (
          <button
            key={id}
            onClick={() => {
              if (!isActive) navigate(path);
            }}
            // Labels matter here: four icon-only buttons is at the edge of
            // guessable, and FolderKanban for "Projects" is not self-evident.
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-4 py-2 min-w-[64px] min-h-[52px] transition-colors ${
              isActive ? "text-ember" : "text-text-secondary hover:text-text-primary"
            }`}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <motion.span
                layoutId="bottom-nav-pill"
                className="absolute inset-0 rounded-2xl bg-surface-raised"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon className="w-5 h-5 relative z-10" />
            <span className="text-[10px] font-semibold leading-none relative z-10">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
