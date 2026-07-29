/**
 * Admin login screen — email/password form.
 *
 * Styled with the same design tokens as the rest of the app:
 * bg-ink, glass-strong, hairline-border, ember accent.
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { ShieldAlert } from "lucide-react";

export default function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { signIn, error: authError, loading } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Please enter email and password.");
      return;
    }

    try {
      await signIn(email, password);
      navigate("/admin", { replace: true });
    } catch {
      // error is set in context
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="w-full max-w-sm"
      >
        <div className="glass-strong rounded-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ember/10 mb-2">
              <ShieldAlert className="w-6 h-6 text-ember" />
            </div>
            <h1 className="text-screen-title">Admin Login</h1>
            <p className="text-body text-white/50">StudioStride Content Manager</p>
          </div>

          {/* Error */}
          {displayError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
              {displayError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="text-label text-white/60 block mb-1.5">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@studiostride.app"
                className="w-full px-4 py-3 rounded-xl bg-surface-raised border hairline-border text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-ember/50 text-sm"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="text-label text-white/60 block mb-1.5">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-surface-raised border hairline-border text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-ember/50 text-sm"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-ember text-ink font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Back link */}
          <div className="text-center">
            <button
              onClick={() => navigate("/")}
              className="text-xs text-white/40 hover:text-ember transition-colors"
            >
              ← Back to app
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
