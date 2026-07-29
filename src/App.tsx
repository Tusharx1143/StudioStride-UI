/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, RequireAuth, useAuth } from "./contexts/AuthContext";
import { HealthConnectProvider, useHealthConnect } from "./contexts/HealthConnectContext";
import { ActivitySourcesProvider } from "./contexts/ActivitySourcesContext";
import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import ProfileScreen from "./components/ProfileScreen";
import ProjectsScreen from "./components/ProjectsScreen";
import SnapCamera from "./components/SnapCamera";
import ErrorBoundary from "./components/ErrorBoundary";

// ---------------------------------------------------------------------------
// Combined auth guard — accepts Strava OR Health Connect
// ---------------------------------------------------------------------------

function RequireAnyAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { state: hcState } = useHealthConnect();
  const navigate = useNavigate();

  const hcAuthorized = hcState.available && hcState.authorized;
  const stravaAuthed = status === "authenticated";
  const isAllowed = stravaAuthed || hcAuthorized;
  const isLoading = status === "loading" || hcState.loading;

  useEffect(() => {
    if (!isLoading && !isAllowed) {
      navigate("/", { replace: true });
    }
  }, [isAllowed, isLoading, navigate]);

  if (isLoading && !hcAuthorized && !stravaAuthed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ink">
        <div className="w-8 h-8 border-2 border-ember border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAllowed) return null;

  return <>{children}</>;
}

const pageVariants = {
  initial: { opacity: 0, scale: 0.98, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 1.01, y: -8 },
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <ErrorBoundary>
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                <AuthScreen />
              </motion.div>
            </ErrorBoundary>
          }
        />
        <Route
          path="/home"
          element={
            <ErrorBoundary>
              <RequireAnyAuth>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                  <HomeScreen />
                </motion.div>
              </RequireAnyAuth>
            </ErrorBoundary>
          }
        />
        <Route
          path="/profile"
          element={
            <ErrorBoundary>
              <RequireAnyAuth>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                  <ProfileScreen />
                </motion.div>
              </RequireAnyAuth>
            </ErrorBoundary>
          }
        />
        <Route
          path="/projects"
          element={
            <ErrorBoundary>
              <RequireAnyAuth>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                  <ProjectsScreen />
                </motion.div>
              </RequireAnyAuth>
            </ErrorBoundary>
          }
        />
        <Route
          path="/camera"
          element={
            <ErrorBoundary>
              <RequireAnyAuth>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                  <SnapCamera />
                </motion.div>
              </RequireAnyAuth>
            </ErrorBoundary>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <HealthConnectProvider>
            <ActivitySourcesProvider>
              <AnimatedRoutes />
            </ActivitySourcesProvider>
          </HealthConnectProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
