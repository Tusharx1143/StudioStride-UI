/**
 * Application feature flags.
 *
 * All flags are controlled via Vite env vars (VITE_*).
 * Defaults are set here for cases where env vars are undefined.
 */

/** Pull content from Firestore instead of hardcoded mock data. */
export const USE_FIREBASE_CONTENT =
  import.meta.env.VITE_USE_FIREBASE_CONTENT === "true";

/** Whether Firebase emulators are active (local dev). */
export const FIREBASE_EMULATOR =
  import.meta.env.VITE_FIREBASE_EMULATOR === "true";
