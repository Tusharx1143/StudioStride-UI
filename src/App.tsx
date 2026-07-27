/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import ProfileScreen from "./components/ProfileScreen";
import EditorScreen from "./components/EditorScreen";
import ProjectsScreen from "./components/ProjectsScreen";
import SnapCamera from "./components/SnapCamera";

const pageVariants = {
  initial: { opacity: 0, scale: 0.98, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 1.01, y: -8 },
};

const pageTransition = {
  type: "spring",
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
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
              <AuthScreen />
            </motion.div>
          }
        />
        <Route
          path="/home"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
              <HomeScreen />
            </motion.div>
          }
        />
        <Route
          path="/profile"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
              <ProfileScreen />
            </motion.div>
          }
        />
        <Route
          path="/editor"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
              <EditorScreen />
            </motion.div>
          }
        />
        <Route
          path="/projects"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
              <ProjectsScreen />
            </motion.div>
          }
        />
        <Route
          path="/camera"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="w-full h-full">
              <SnapCamera />
            </motion.div>
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
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
