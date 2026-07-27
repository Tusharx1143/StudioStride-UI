/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import ProfileScreen from "./components/ProfileScreen";
import EditorScreen from "./components/EditorScreen";
import ProjectsScreen from "./components/ProjectsScreen";
import SnapCamera from "./components/SnapCamera";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthScreen />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/editor" element={<EditorScreen />} />
        <Route path="/projects" element={<ProjectsScreen />} />
        <Route path="/camera" element={<SnapCamera />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
