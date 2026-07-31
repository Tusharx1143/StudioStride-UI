import { describe, test, expect, beforeEach, vi } from "vitest";
import { isAllowedFontUrl, injectFontStylesheets, normalizeFontUrl, familyFromFontUrl } from "./fontLoader";
import type { FirestoreFont } from "../types/content";

const font = (over: Partial<FirestoreFont>): FirestoreFont => ({
  id: "inter",
  name: "Inter",
  fontFamily: "'Inter', sans-serif",
  category: "sans-serif",
  weights: ["400", "700"],
  fallback: "sans-serif",
  createdAt: "",
  updatedAt: "",
  isActive: true,
  createdBy: "admin",
  ...over,
});

describe("normalizeFontUrl", () => {
  test("rewrites a Google Fonts specimen page to its css2 stylesheet", () => {
    // The exact value found in the live library — a page, not a stylesheet.
    expect(normalizeFontUrl("https://fonts.google.com/specimen/Rock+Salt")).toBe(
      "https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap"
    );
  });

  test("handles a single-word family and a trailing path", () => {
    expect(normalizeFontUrl("https://fonts.google.com/specimen/Lobster")).toBe(
      "https://fonts.googleapis.com/css2?family=Lobster&display=swap"
    );
    expect(normalizeFontUrl("https://fonts.google.com/specimen/Rock+Salt/license")).toBe(
      "https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap"
    );
  });

  test("leaves an already-correct css2 URL alone", () => {
    const url = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700";
    expect(normalizeFontUrl(url)).toBe(url);
  });

  test("trims but does not otherwise touch unrelated or invalid input", () => {
    expect(normalizeFontUrl("  https://use.typekit.net/abc.css  ")).toBe("https://use.typekit.net/abc.css");
    expect(normalizeFontUrl("not a url")).toBe("not a url");
  });

  test("a normalized specimen URL passes the allowlist", () => {
    // The whole point: this pairing is what makes existing docs self-heal.
    expect(isAllowedFontUrl(normalizeFontUrl("https://fonts.google.com/specimen/Rock+Salt"))).toBe(true);
    expect(isAllowedFontUrl("https://fonts.google.com/specimen/Rock+Salt")).toBe(false);
  });
});

describe("familyFromFontUrl", () => {
  test("reads the family a css2 URL registers, decoding '+' to a space", () => {
    // The live Rock Salt record stored fontFamily "RockSalt", which never
    // matches the registered "Rock Salt" — this is how that gets caught.
    expect(familyFromFontUrl("https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap")).toBe("Rock Salt");
    expect(familyFromFontUrl("https://fonts.googleapis.com/css2?family=Inter:wght@400;700")).toBe("Inter");
  });

  test("works off a specimen URL by normalizing first", () => {
    expect(familyFromFontUrl("https://fonts.google.com/specimen/Rock+Salt")).toBe("Rock Salt");
  });

  test("returns null when there is no family to read", () => {
    expect(familyFromFontUrl(undefined)).toBeNull();
    expect(familyFromFontUrl("https://use.typekit.net/abc.css")).toBeNull();
    expect(familyFromFontUrl("nonsense")).toBeNull();
  });
});

describe("isAllowedFontUrl", () => {
  test("accepts https Google Fonts URLs", () => {
    expect(isAllowedFontUrl("https://fonts.googleapis.com/css2?family=Inter")).toBe(true);
  });

  test("rejects plain http even on an allowed host", () => {
    expect(isAllowedFontUrl("http://fonts.googleapis.com/css2?family=Inter")).toBe(false);
  });

  test("rejects hosts outside the allowlist", () => {
    expect(isAllowedFontUrl("https://evil.example.com/font.css")).toBe(false);
  });

  test("rejects junk and missing values", () => {
    expect(isAllowedFontUrl("not a url")).toBe(false);
    expect(isAllowedFontUrl(undefined)).toBe(false);
    expect(isAllowedFontUrl("")).toBe(false);
  });

  test("is not fooled by an allowed host in the path or userinfo", () => {
    expect(isAllowedFontUrl("https://evil.example.com/fonts.googleapis.com/x.css")).toBe(false);
    expect(isAllowedFontUrl("https://fonts.googleapis.com@evil.example.com/x.css")).toBe(false);
  });
});

/**
 * The suite runs on `environment: 'node'`, so there is no real document. This
 * fake implements exactly the four calls injectFontStylesheets makes — cheaper
 * than pulling in jsdom for one file.
 */
function fakeDoc() {
  const links: { rel: string; href: string; attrs: Record<string, string>;
    setAttribute(k: string, v: string): void; getAttribute(k: string): string | null }[] = [];
  const doc = {
    head: {
      querySelectorAll: () => links,
      appendChild: (link: (typeof links)[number]) => { links.push(link); },
    },
    createElement: () => ({
      rel: "",
      href: "",
      attrs: {} as Record<string, string>,
      setAttribute(k: string, v: string) { this.attrs[k] = v; },
      getAttribute(k: string) { return k === "href" ? this.href : this.attrs[k] ?? null; },
    }),
  };
  return { doc: doc as unknown as Document, links };
}

describe("injectFontStylesheets", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  test("adds a stylesheet link for an allowed font URL", () => {
    const { doc, links } = fakeDoc();
    const added = injectFontStylesheets(
      [font({ googleFontUrl: "https://fonts.googleapis.com/css2?family=Inter" })],
      doc
    );
    expect(added).toBe(1);
    expect(links).toHaveLength(1);
    expect(links[0].rel).toBe("stylesheet");
    // Rebuilt through the batcher, which always asks for display=swap so text
    // paints in the fallback instead of staying invisible while the face loads.
    expect(links[0].href).toBe("https://fonts.googleapis.com/css2?family=Inter&display=swap");
  });

  test("combines many Google families into a single request", () => {
    const { doc, links } = fakeDoc();
    const many = ["Anton", "Oswald", "Teko", "Kanit", "Sora"].map((name, i) =>
      font({ id: `f${i}`, name, googleFontUrl: `https://fonts.googleapis.com/css2?family=${name}&display=swap` })
    );
    expect(injectFontStylesheets(many, doc)).toBe(1);
    expect(links).toHaveLength(1);
    for (const name of ["Anton", "Oswald", "Teko", "Kanit", "Sora"]) {
      expect(links[0].href).toContain(`family=${name}`);
    }
  });

  test("preserves each family's weight axis when batching", () => {
    const { doc, links } = fakeDoc();
    injectFontStylesheets(
      [
        font({ id: "a", name: "Inter", googleFontUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;700&display=swap" }),
        font({ id: "b", name: "Anton", googleFontUrl: "https://fonts.googleapis.com/css2?family=Anton&display=swap" }),
      ],
      doc
    );
    expect(links[0].href).toContain("family=Inter:wght@300;700");
    expect(links[0].href).toContain("family=Anton");
  });

  test("does not re-request a family already covered by a batch", () => {
    const { doc, links } = fakeDoc();
    const fonts = ["Anton", "Oswald"].map((name, i) =>
      font({ id: `f${i}`, name, googleFontUrl: `https://fonts.googleapis.com/css2?family=${name}&display=swap` })
    );
    injectFontStylesheets(fonts, doc);
    expect(injectFontStylesheets(fonts, doc)).toBe(0);
    expect(links).toHaveLength(1);
  });

  test("splits into more than one request rather than emitting a giant URL", () => {
    const { doc, links } = fakeDoc();
    const many = Array.from({ length: 60 }, (_, i) =>
      font({
        id: `f${i}`,
        name: `Family Number ${i}`,
        googleFontUrl: `https://fonts.googleapis.com/css2?family=Family+Number+${i}:wght@300;400;500;600;700&display=swap`,
      })
    );
    injectFontStylesheets(many, doc);
    expect(links.length).toBeGreaterThan(1);
    for (const link of links) expect(link.href.length).toBeLessThanOrEqual(1800);
    // Every family still ends up requested exactly once, across the batches.
    const all = links.map((l) => l.href).join("&");
    for (let i = 0; i < 60; i++) {
      expect(all).toContain(`family=Family+Number+${i}:`);
    }
  });

  test("links a non-css2 CDN URL on its own rather than batching it", () => {
    const { doc, links } = fakeDoc();
    injectFontStylesheets(
      [
        font({ id: "a", name: "Anton", googleFontUrl: "https://fonts.googleapis.com/css2?family=Anton&display=swap" }),
        font({ id: "b", name: "Kit", googleFontUrl: "https://use.typekit.net/abc.css" }),
      ],
      doc
    );
    expect(links).toHaveLength(2);
    expect(links.some((l) => l.href === "https://use.typekit.net/abc.css")).toBe(true);
  });

  test("does not duplicate a link when called again", () => {
    const { doc, links } = fakeDoc();
    const fonts = [font({ googleFontUrl: "https://fonts.googleapis.com/css2?family=Inter" })];
    injectFontStylesheets(fonts, doc);
    expect(injectFontStylesheets(fonts, doc)).toBe(0);
    expect(links).toHaveLength(1);
  });

  test("does not add the same URL twice within one call", () => {
    const { doc, links } = fakeDoc();
    const url = "https://fonts.googleapis.com/css2?family=Inter";
    injectFontStylesheets(
      [font({ id: "a", googleFontUrl: url }), font({ id: "b", googleFontUrl: url })],
      doc
    );
    expect(links).toHaveLength(1);
  });

  test("skips fonts with no URL without warning", () => {
    const { doc, links } = fakeDoc();
    expect(injectFontStylesheets([font({ googleFontUrl: undefined })], doc)).toBe(0);
    expect(links).toHaveLength(0);
    expect(console.warn).not.toHaveBeenCalled();
  });

  test("injects a specimen-page URL as its rewritten stylesheet", () => {
    const { doc, links } = fakeDoc();
    expect(
      injectFontStylesheets([font({ googleFontUrl: "https://fonts.google.com/specimen/Rock+Salt" })], doc)
    ).toBe(1);
    expect(links[0].href).toBe("https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap");
    expect(console.warn).not.toHaveBeenCalled();
  });

  test("skips and warns about a disallowed URL", () => {
    const { doc, links } = fakeDoc();
    expect(
      injectFontStylesheets([font({ googleFontUrl: "https://evil.example.com/f.css" })], doc)
    ).toBe(0);
    expect(links).toHaveLength(0);
    expect(console.warn).toHaveBeenCalled();
  });

  test("handles URLs full of ':' '@' and ';' without choking", () => {
    const { doc, links } = fakeDoc();
    const fonts = [font({
      googleFontUrl: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700",
    })];
    expect(injectFontStylesheets(fonts, doc)).toBe(1);
    expect(injectFontStylesheets(fonts, doc)).toBe(0);
    expect(links).toHaveLength(1);
  });
});
