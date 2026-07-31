/**
 * Curated typefaces that ship with the app.
 *
 * These are always available in the editor's typeface picker, whether or not
 * anyone has published a font in /admin — the Firestore font library adds to
 * this list rather than replacing it (see `mergeFonts`). Seeding them into
 * Firestore (Admin → Sync to Firebase) also makes them editable records in the
 * Content Manager.
 *
 * `fontFamily` MUST name exactly the family the stylesheet registers, or the
 * face downloads and nothing is able to select it — the failure mode that made
 * the hand-entered "RockSalt" record render as a fallback for months.
 */

import type { FirestoreFont } from "../types/content";

/** Build a css2 stylesheet URL for a family at the given weights. */
export function googleCss2(family: string, weights: string[]): string {
  const name = family.replace(/\s+/g, "+");
  // Single-weight families have no `wght` axis to request.
  const axis = weights.length > 1 ? `:wght@${weights.join(";")}` : "";
  return `https://fonts.googleapis.com/css2?family=${name}${axis}&display=swap`;
}

/** Weight sets, named so the table below stays readable. */
const W = {
  one: ["400"],
  bold: ["400", "700"],
  light: ["300", "400", "500", "600", "700"],
  wide: ["300", "400", "500", "600", "700", "800"],
  full: ["300", "400", "500", "600", "700", "800", "900"],
  heavy: ["400", "500", "600", "700", "800", "900"],
  oswald: ["200", "300", "400", "500", "600", "700"],
  teko: ["300", "400", "500", "600", "700"],
  caveat: ["400", "500", "600", "700"],
  kalam: ["300", "400", "700"],
};

type Row = [family: string, category: string, weights: string[], fallback: string];

/**
 * family, category, weights, fallback — grouped by the job each does, which is
 * how a creator picks one.
 */
const TABLE: Row[] = [
  // ── Condensed / poster display: huge numbers, headlines ──
  ["Anton", "display", W.one, "sans-serif"],
  ["League Spartan", "display", W.full, "sans-serif"],
  ["Barlow Condensed", "display", W.full, "sans-serif"],
  ["Oswald", "display", W.oswald, "sans-serif"],
  ["Teko", "display", W.teko, "sans-serif"],
  ["Archivo Black", "display", W.one, "sans-serif"],
  ["Kanit", "display", W.full, "sans-serif"],
  ["Saira Condensed", "display", W.full, "sans-serif"],

  // ── Techno / LED / sci-fi ──
  ["Rajdhani", "display", W.teko, "sans-serif"],
  ["Orbitron", "display", W.heavy, "sans-serif"],
  ["Exo 2", "display", W.full, "sans-serif"],
  ["Audiowide", "display", W.one, "sans-serif"],
  ["Michroma", "display", W.one, "sans-serif"],
  ["Chakra Petch", "display", W.teko, "sans-serif"],
  ["Oxanium", "display", W.wide, "sans-serif"],

  // ── Heavy impact / arcade ──
  ["Russo One", "display", W.one, "sans-serif"],
  ["Black Ops One", "display", W.one, "sans-serif"],
  ["Rubik Mono One", "display", W.one, "sans-serif"],

  // ── Monospace / terminal ──
  ["Silkscreen", "display", W.bold, "monospace"],
  ["IBM Plex Mono", "monospace", W.light, "monospace"],
  ["Space Mono", "monospace", W.bold, "monospace"],
  ["JetBrains Mono", "monospace", W.wide, "monospace"],
  ["Share Tech Mono", "monospace", W.one, "monospace"],

  // ── Modern UI sans ──
  ["Inter", "sans-serif", W.full, "sans-serif"],
  ["Space Grotesk", "sans-serif", W.teko, "sans-serif"],
  ["Plus Jakarta Sans", "sans-serif", W.wide, "sans-serif"],
  ["Manrope", "sans-serif", W.wide, "sans-serif"],
  ["Outfit", "sans-serif", W.full, "sans-serif"],
  ["Sora", "sans-serif", W.wide, "sans-serif"],
  ["Urbanist", "sans-serif", W.full, "sans-serif"],

  // ── Handwritten / marker ──
  ["Permanent Marker", "handwriting", W.one, "cursive"],
  ["Rock Salt", "handwriting", W.one, "cursive"],
  ["Caveat", "handwriting", W.caveat, "cursive"],
  ["Patrick Hand", "handwriting", W.one, "cursive"],
  ["Kalam", "handwriting", W.kalam, "cursive"],

  // ── Serif ──
  ["Cormorant Garamond", "serif", W.light, "serif"],
];

/** `Space Grotesk` → `builtin_space_grotesk`. */
function builtInId(family: string): string {
  return `builtin_${family.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

export const BUILT_IN_FONTS: FirestoreFont[] = TABLE.map(
  ([family, category, weights, fallback]) => ({
    id: builtInId(family),
    name: family,
    fontFamily: `'${family}', ${fallback}`,
    category,
    weights,
    googleFontUrl: googleCss2(family, weights),
    fallback,
    createdAt: "",
    updatedAt: "",
    isActive: true,
    createdBy: "builtin",
  })
);
