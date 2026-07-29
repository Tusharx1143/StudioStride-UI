import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  /** Resolved theme — always "light" or "dark" */
  resolved: "light" | "dark";
  /** User preference. "system" = follow OS setting */
  preference: Theme;
  setPreference: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(pref: Theme): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return pref;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme>(() => {
    return (localStorage.getItem("theme-preference") as Theme) ?? "dark";
  });

  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(preference));

  // Listen for OS theme changes when in "system" mode
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => setResolved(mq.matches ? "light" : "dark");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  // Apply data attribute + class to root
  useEffect(() => {
    const actual = resolve(preference);
    setResolved(actual);

    const root = document.documentElement;
    root.setAttribute("data-theme", actual);

    // The dark class overrides light media query in CSS
    if (actual === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [preference]);

  const toggle = () => {
    setPreference((prev) => {
      const next = resolve(prev) === "dark" ? "light" : "dark";
      localStorage.setItem("theme-preference", next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ resolved, preference, setPreference, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
