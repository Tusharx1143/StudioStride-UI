/**
 * Admin dashboard — wraps AdminLayout with nested routes per content type.
 */

import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./shared/AdminLayout";
import TemplateFamilyManager from "./TemplateFamilyManager";
import StatDesignManager from "./StatDesignManager";
import LensTemplateManager from "./LensTemplateManager";
import StickerManager from "./StickerManager";
import StockPhotoManager from "./StockPhotoManager";
import LensFilterManager from "./LensFilterManager";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { seedAllContentToFirebase, type SeedResult } from "../../data/seedContent";
import { Upload } from "lucide-react";

function AdminOverview() {
  const { adminUser } = useAdminAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-screen-title">Welcome, {adminUser?.email ?? "Admin"}</h1>
        <p className="text-body text-white/50 mt-1">
          Manage templates, stickers, lenses, stock photos, and filters.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Template Families", path: "/admin/templates", color: "bg-ember/10 text-ember" },
          { label: "Stat Designs", path: "/admin/stat-designs", color: "bg-purple-500/10 text-purple-400" },
          { label: "Lens Templates", path: "/admin/lenses", color: "bg-cyan-500/10 text-cyan-400" },
          { label: "Stickers", path: "/admin/stickers", color: "bg-pink-500/10 text-pink-400" },
          { label: "Stock Photos", path: "/admin/stock-photos", color: "bg-green-500/10 text-green-400" },
          { label: "Lens Filters", path: "/admin/filters", color: "bg-yellow-500/10 text-yellow-400" },
        ].map((item) => (
          <a
            key={item.path}
            href={item.path}
            className="block p-4 rounded-xl bg-surface-raised border hairline-border hover:bg-surface-overlay transition-colors"
          >
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${item.color}`}>
              {item.label}
            </div>
          </a>
        ))}
      </div>

      {/* Seed button */}
      <div className="p-4 rounded-xl bg-surface-raised border hairline-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Sync Mock Data</h3>
            <p className="text-xs text-white/40 mt-0.5">Upload all hardcoded content to Firebase Firestore</p>
          </div>
          <button
            onClick={async () => {
              setSeeding(true);
              setSeedResult(null);
              try {
                const result = await seedAllContentToFirebase();
                setSeedResult(result);
              } catch (err: unknown) {
                setSeedResult({ success: false, counts: {}, error: err instanceof Error ? err.message : "Unknown error" });
              }
              setSeeding(false);
            }}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ember text-ink text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className={`w-4 h-4 ${seeding ? "animate-spin" : ""}`} />
            {seeding ? "Syncing…" : "Sync to Firebase"}
          </button>
        </div>
        {seedResult && (
          <div className={`p-3 rounded-lg text-xs ${seedResult.success ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
            {seedResult.success
              ? `Synced: ${Object.entries(seedResult.counts).map(([k, v]) => `${k}: ${v}`).join(", ")}`
              : `Failed: ${seedResult.error}`}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="templates" element={<TemplateFamilyManager />} />
        <Route path="stat-designs" element={<StatDesignManager />} />
        <Route path="lenses" element={<LensTemplateManager />} />
        <Route path="stickers" element={<StickerManager />} />
        <Route path="stock-photos" element={<StockPhotoManager />} />
        <Route path="filters" element={<LensFilterManager />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
