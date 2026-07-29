/**
 * Firebase Auth provider for admin authentication.
 *
 * Uses email/password authentication via Firebase Auth.
 * On successful sign-in, checks for the `admin: true` custom claim
 * to determine if the user has admin privileges.
 *
 * ── Usage ──
 *   const { adminUser, signIn, signOut, isAdmin, loading } = useAdminAuth();
 *   if (isAdmin) { /* show admin UI *\/ }
 *
 * ── Guard ──
 *   <RequireAdminAuth><AdminDashboard /></RequireAdminAuth>
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdTokenResult,
  type User,
} from "firebase/auth";
import { getAuthInstance } from "../services/firebase";
import { useNavigate } from "react-router-dom";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminAuthContextValue {
  adminUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track auth state changes
  useEffect(() => {
    const authInstance = getAuthInstance();
    if (!authInstance) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      setAdminUser(user);
      if (user) {
        try {
          const tokenResult = await getIdTokenResult(user);
          setIsAdmin(tokenResult.claims.admin === true);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const authInstance = getAuthInstance();
      if (!authInstance) throw new Error("Firebase Auth not available");

      const result = await signInWithEmailAndPassword(authInstance, email, password);

      // Verify admin claim
      const tokenResult = await getIdTokenResult(result.user);
      if (tokenResult.claims.admin !== true) {
        await firebaseSignOut(authInstance);
        setAdminUser(null);
        setIsAdmin(false);
        setError("This account does not have admin privileges.");
        return;
      }

      setAdminUser(result.user);
      setIsAdmin(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const authInstance = getAuthInstance();
    if (authInstance) {
      await firebaseSignOut(authInstance);
    }
    setAdminUser(null);
    setIsAdmin(false);
  }, []);

  const value: AdminAuthContextValue = {
    adminUser,
    isAdmin,
    loading,
    error,
    signIn,
    signOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an <AdminAuthProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Route guard
// ---------------------------------------------------------------------------

interface RequireAdminAuthProps {
  children: ReactNode;
}

export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const { adminUser, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!adminUser || !isAdmin)) {
      navigate("/admin/login", { replace: true });
    }
  }, [adminUser, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ink">
        <div className="w-8 h-8 border-2 border-ember border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!adminUser || !isAdmin) return null;

  return <>{children}</>;
}
