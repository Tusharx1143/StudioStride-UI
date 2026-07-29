/**
 * Firebase initialization and singleton exports.
 *
 * Lazy initialization — Firebase is only loaded when the first consumer
 * (admin auth or content service) actually calls getFirebase().
 *
 * ── Environment variables ──
 * All VITE_FIREBASE_* vars must be set in .env.
 * See .env.example for the full list.
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

const isConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// ---------------------------------------------------------------------------
// Lazy singletons
// ---------------------------------------------------------------------------

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let initialized = false;

/**
 * Initializes Firebase app + services on the first call.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function getFirebase() {
  if (initialized) return { app, auth, db, storage };

  if (!isConfigured()) {
    console.warn(
      "[Firebase] VITE_FIREBASE_* env vars are missing. " +
        "Firebase features (admin auth, content storage) will be unavailable."
    );
    initialized = true;
    return { app: null, auth: null, db: null, storage: null };
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // ── Emulator support (local dev) ──
  if (import.meta.env.VITE_FIREBASE_EMULATOR === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    console.log("[Firebase] Connected to local emulators");
  }

  initialized = true;
  return { app, auth, db, storage };
}

/** Convenience accessors — ensure init before use. */
export function getAuthInstance(): Auth | null {
  getFirebase();
  return auth;
}

export function getDbInstance(): Firestore | null {
  getFirebase();
  return db;
}

export function getStorageInstance(): FirebaseStorage | null {
  getFirebase();
  return storage;
}

/** Whether Firebase has been configured (env vars present). */
export function isFirebaseAvailable(): boolean {
  return isConfigured();
}
