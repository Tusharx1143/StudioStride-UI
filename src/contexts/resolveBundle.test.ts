import { describe, it, expect } from "vitest";
import { resolveBundle, mergeFonts } from "./ContentContext";
import type { ContentBundle, FirestoreFont } from "../types/content";

/**
 * The rules that decide whether the app shows Firestore content or the
 * hardcoded library. Getting these wrong empties the editor, which is exactly
 * what the old all-or-nothing check did once one collection was populated.
 */

const family = (id: string) => ({ id, name: id }) as ContentBundle["templateFamilies"][number];
const lens = (id: string) => ({ id, name: id }) as ContentBundle["lensTemplates"][number];
const photo = (id: string) => ({ id, url: `${id}.jpg` }) as ContentBundle["stockPhotos"][number];
const sticker = (id: string) =>
  ({ id, content: id, label: id, category: "Badges", type: "badge" }) as ContentBundle["stickers"][number];
/** `family` is the name the stylesheet registers; `fontFamily` may disagree. */
const fnt = (name: string, fontFamily: string, urlFamily?: string): FirestoreFont =>
  ({
    id: `f_${name}`,
    name,
    fontFamily,
    category: "display",
    weights: ["400"],
    fallback: "sans-serif",
    googleFontUrl: urlFamily
      ? `https://fonts.googleapis.com/css2?family=${urlFamily.replace(/\s+/g, "+")}&display=swap`
      : undefined,
    createdAt: "",
    updatedAt: "",
    isActive: true,
    createdBy: "test",
  }) as FirestoreFont;

const design = (name: string) =>
  ({ defaultLayout: { distance: { x: 1, y: 1 } }, name }) as unknown as ContentBundle["statDesigns"][string];

const mock: ContentBundle = {
  templateFamilies: [family("hero"), family("glass")],
  statDesigns: { hero: design("mock-hero"), glass: design("mock-glass") },
  lensTemplates: [lens("vintage")],
  stickers: [sticker("st_1")],
  stockPhotos: [photo("stock")],
  lensFilters: { vintage: "sepia(0.5)", mono: "grayscale(1)" },
  fonts: [],
  colorPalettes: [],
};

const empty: ContentBundle = {
  templateFamilies: [],
  statDesigns: {},
  lensTemplates: [],
  stickers: [],
  stockPhotos: [],
  lensFilters: {},
  fonts: [],
  colorPalettes: [],
};

describe("resolveBundle", () => {
  it("falls back to the hardcoded library when Firestore is empty", () => {
    expect(resolveBundle(empty, mock)).toEqual(mock);
  });

  it("keeps collections Firestore has nothing for — the partial-store case", () => {
    // A real store: lenses published, stock photos never uploaded.
    const partial = { ...empty, lensTemplates: [lens("neon")] };
    const out = resolveBundle(partial, mock);

    expect(out.lensTemplates).toEqual([lens("neon")]);
    // The old all-or-nothing rule blanked these, crashing the photo picker.
    expect(out.stockPhotos).toEqual(mock.stockPhotos);
    expect(out.templateFamilies).toEqual(mock.templateFamilies);
  });

  it("replaces a list wholesale so unpublishing really removes an item", () => {
    const out = resolveBundle({ ...empty, templateFamilies: [family("hero")] }, mock);
    expect(out.templateFamilies).toEqual([family("hero")]);
    expect(out.templateFamilies.find((f) => f.id === "glass")).toBeUndefined();
  });

  it("merges records so one configured design does not orphan the rest", () => {
    const out = resolveBundle({ ...empty, statDesigns: { hero: design("live-hero") } }, mock);

    expect(out.statDesigns.hero).toEqual(design("live-hero")); // admin wins
    expect(out.statDesigns.glass).toEqual(mock.statDesigns.glass); // untouched survives
  });

  it("keeps built-in fonts when Firestore publishes none", () => {
    const builtIn = [fnt("Anton", "'Anton', sans-serif", "Anton")];
    const out = resolveBundle({ ...empty }, { ...mock, fonts: builtIn });
    expect(out.fonts.map((f) => f.name)).toEqual(["Anton"]);
  });

  it("lets an admin filter override a built-in and add new ones", () => {
    const out = resolveBundle(
      { ...empty, lensFilters: { vintage: "sepia(0.9)", cyber: "hue-rotate(90deg)" } },
      mock
    );

    expect(out.lensFilters).toEqual({
      vintage: "sepia(0.9)",
      mono: "grayscale(1)",
      cyber: "hue-rotate(90deg)",
    });
  });
});

describe("mergeFonts", () => {
  const builtInRockSalt = fnt("Rock Salt", "'Rock Salt', cursive", "Rock Salt");

  it("adds published fonts alongside the built-ins", () => {
    const out = mergeFonts([fnt("Silkscreen", "'Silkscreen', monospace", "Silkscreen")], [builtInRockSalt]);
    expect(out.map((f) => f.name).sort()).toEqual(["Rock Salt", "Silkscreen"]);
  });

  it("lets a usable published font override a built-in of the same name", () => {
    const published = fnt("Rock Salt", "'Rock Salt', fantasy", "Rock Salt");
    const out = mergeFonts([published], [builtInRockSalt]);
    expect(out).toHaveLength(1);
    expect(out[0].fontFamily).toBe("'Rock Salt', fantasy");
  });

  it("keeps the built-in when the published record cannot render", () => {
    // The real case: fontFamily "RockSalt" never matches the registered
    // "Rock Salt", so the published record would load nothing.
    const broken = fnt("Rock Salt", "RockSalt", "Rock Salt");
    const out = mergeFonts([broken], [builtInRockSalt]);
    expect(out).toHaveLength(1);
    expect(out[0].fontFamily).toBe("'Rock Salt', cursive");
  });

  it("still takes a published font with no built-in counterpart, broken or not", () => {
    const broken = fnt("Weird", "Weird", "Weird Face");
    expect(mergeFonts([broken], [builtInRockSalt]).map((f) => f.name).sort()).toEqual(["Rock Salt", "Weird"]);
  });

  it("retires a built-in when its seeded document is unpublished", () => {
    // Without this the Published toggle silently does nothing for a bundled
    // font — the built-in copy just comes straight back.
    const retired = { ...fnt("Rock Salt", "'Rock Salt', cursive", "Rock Salt"), isActive: false };
    expect(mergeFonts([retired], [builtInRockSalt])).toEqual([]);
  });

  it("keeps other built-ins when one is retired", () => {
    const retired = { ...fnt("Rock Salt", "'Rock Salt', cursive", "Rock Salt"), isActive: false };
    const anton = fnt("Anton", "'Anton', sans-serif", "Anton");
    expect(mergeFonts([retired], [builtInRockSalt, anton]).map((f) => f.name)).toEqual(["Anton"]);
  });

  it("matches names case- and whitespace-insensitively", () => {
    const out = mergeFonts([fnt("  rock salt ", "'Rock Salt', fantasy", "Rock Salt")], [builtInRockSalt]);
    expect(out).toHaveLength(1);
  });
});
