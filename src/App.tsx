/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { AuthProvider, RequireAuth } from "./contexts/AuthContext";
import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import ProfileScreen from "./components/ProfileScreen";
import EditorScreen from "./components/EditorScreen";
import ProjectsScreen from "./components/ProjectsScreen";
import SnapCamera from "./components/SnapCamera";
import ErrorBoundary from "./components/ErrorBoundary";

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
              <RequireAuth>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                  <HomeScreen />
                </motion.div>
              </RequireAuth>
            </ErrorBoundary>
          }
        />
        <Route
          path="/profile"
          element={
            <ErrorBoundary>
              <RequireAuth>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                  <ProfileScreen />
                </motion.div>
              </RequireAuth>
            </ErrorBoundary>
          }
        />
        <Route
          path="/editor"
          element={
            <ErrorBoundary>
              <RequireAuth>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                  <EditorScreen />
                </motion.div>
              </RequireAuth>
            </ErrorBoundary>
          }
        />
        <Route
          path="/projects"
          element={
            <ErrorBoundary>
              <RequireAuth>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                  <ProjectsScreen />
                </motion.div>
              </RequireAuth>
            </ErrorBoundary>
          }
        />
        <Route
          path="/camera"
          element={
            <ErrorBoundary>
              <RequireAuth>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
                  <SnapCamera />
                </motion.div>
              </RequireAuth>
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
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
