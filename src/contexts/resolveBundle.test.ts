import { describe, it, expect } from "vitest";
import { resolveBundle } from "./ContentContext";
import type { ContentBundle } from "../types/content";

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
