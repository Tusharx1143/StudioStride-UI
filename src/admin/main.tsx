/**
 * Standalone admin web entry — no mobile code, just admin UI.
 * Served at /admin.html (dev) or /admin/ (production).
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider, RequireAdminAuth } from "../contexts/AdminAuthContext";
import { ContentProvider } from "../contexts/ContentContext";
import AdminLoginScreen from "../components/admin/AdminLoginScreen";
import AdminDashboard from "../components/admin/AdminDashboard";

// Import global styles
import "../index.css";

function AdminApp() {
  return (
    <StrictMode>
      <BrowserRouter>
        <ContentProvider>
          <AdminAuthProvider>
            <Routes>
              <Route path="/admin/login" element={<AdminLoginScreen />} />
              <Route
                path="/admin/*"
                element={
                  <RequireAdminAuth>
                    <AdminDashboard />
                  </RequireAdminAuth>
                }
              />
              <Route index element={<Navigate to="/admin/studio" replace />} />
              <Route path="*" element={<Navigate to="/admin/studio" replace />} />
            </Routes>
          </AdminAuthProvider>
        </ContentProvider>
      </BrowserRouter>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<AdminApp />);
