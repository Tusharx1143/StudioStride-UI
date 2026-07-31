/**
 * Loads admin-defined web fonts into the document.
 *
 * Fonts added in /admin store a `fontFamily` string and a `googleFontUrl`, but
 * nothing ever fetched the latter — so every admin font silently rendered in
 * the fallback face, in the app *and* in the Studio preview the admin was
 * designing against. This module injects the stylesheet links so those
 * `fontFamily` values actually resolve.
 *
 * Called from ContentProvider, which both the app and the admin mount under.
 */

import type { FirestoreFont } from "../types/content";

/**
 * Font CDNs we're willing to pull a stylesheet from.
 *
 * `googleFontUrl` is admin-supplied and gets written straight into a
 * `<link href>`, which makes it a trust boundary. A stylesheet can't execute
 * script, but it can pull resources from an arbitrary host, so the value is
 * pinned to known font CDNs over TLS rather than taken on faith.
 */
const ALLOWED_FONT_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "use.typekit.net",
  "fonts.bunny.net",
]);

/**
 * Repair the URL an admin most plausibly pasted.
 *
 * `fonts.google.com/specimen/Rock+Salt` is the page you land on when browsing
 * Google Fonts, so it's the obvious thing to copy — but it's an HTML document,
 * not a stylesheet, and linking it loads no font at all. Rewriting it to the
 * css2 endpoint means existing documents storing a specimen URL start working
 * without anyone having to re-enter them.
 *
 * Anything else is returned trimmed and otherwise untouched.
 */
export function normalizeFontUrl(url: string): string {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  if (parsed.hostname === "fonts.google.com") {
    const match = parsed.pathname.match(/\/specimen\/([^/]+)/);
    if (match) {
      const family = decodeURIComponent(match[1])
        .replace(/[+_]/g, " ")
        .trim()
        .replace(/\s+/g, "+");
      if (family) {
        return `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
      }
    }
  }

  return trimmed;
}

/** Whether a stored font URL is safe to inject as a stylesheet. */
export function isAllowedFontUrl(url: string | undefined): url is string {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "https:" && ALLOWED_FONT_HOSTS.has(parsed.hostname);
}

/**
 * The CSS family name a Google Fonts stylesheet URL will actually register,
 * e.g. ".../css2?family=Rock+Salt" → "Rock Salt".
 *
 * Worth checking against the stored `fontFamily`: if that string doesn't name
 * this family, the face loads but nothing can ever select it, and the text
 * silently renders in the fallback.
 */
export function familyFromFontUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = normalizeFontUrl(url).match(/[?&]family=([^&:]+)/);
  if (!match) return null;
  const family = decodeURIComponent(match[1]).replace(/\+/g, " ").trim();
  return family || null;
}

/** Marks the links this module owns; value is the font ids it covers. */
const LINK_ATTR = "data-studiostride-font";

/**
 * The source URLs a link satisfies, so repeat calls don't stack duplicates.
 *
 * Separate from the href because one batched link stands in for many per-font
 * URLs, and the href of the batch matches none of them.
 */
const SRC_ATTR = "data-studiostride-font-src";

/**
 * Cap on a batched stylesheet URL, well under what servers and proxies accept.
 * Exceeding it starts a new request rather than risking a truncated one.
 */
const MAX_BATCH_URL_LENGTH = 1800;

const CSS2_ENDPOINT = "https://fonts.googleapis.com/css2";

/**
 * The raw `family=` clauses in a css2 URL, or null if it isn't one.
 *
 * Read off the raw query string rather than via URLSearchParams: the latter
 * decodes '+' to a space, and re-encoding then round-trips to '%20'. Google
 * accepts both, but keeping the original spelling makes the batched URL
 * legible and identical to what the per-font URL would have requested.
 */
function css2Families(url: string): string[] | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (`${parsed.origin}${parsed.pathname}` !== CSS2_ENDPOINT) return null;

  const families = [...parsed.search.matchAll(/[?&]family=([^&]*)/g)].map((m) => m[1]);
  return families.length > 0 ? families : null;
}

/** Combine css2 family clauses into as few URLs as the length cap allows. */
function batchCss2Urls(families: string[]): string[] {
  const urls: string[] = [];
  let current: string[] = [];

  const build = (parts: string[]) =>
    `${CSS2_ENDPOINT}?${parts.map((f) => `family=${f}`).join("&")}&display=swap`;

  for (const family of families) {
    const next = [...current, family];
    if (current.length > 0 && build(next).length > MAX_BATCH_URL_LENGTH) {
      urls.push(build(current));
      current = [family];
    } else {
      current = next;
    }
  }

  if (current.length > 0) urls.push(build(current));
  return urls;
}

/**
 * Ensure a `<link rel="stylesheet">` exists covering every font that declares
 * a usable URL.
 *
 * Google css2 requests are combined — one stylesheet can carry many families,
 * and the curated library alone is 36 of them, which as individual links would
 * be 36 round-trips on a phone before a single glyph paints. Anything not on
 * the css2 endpoint is linked on its own.
 *
 * Additive and idempotent: links are never removed, since tearing them down on
 * every content refresh would flash rendered text back to the fallback face.
 *
 * Returns the number of `<link>` elements newly added.
 */
export function injectFontStylesheets(
  fonts: FirestoreFont[],
  doc: Document = document
): number {
  // Which source URLs existing links already satisfy. Tracked separately from
  // href because one batched link stands in for many per-font URLs.
  const present = new Set<string>();
  for (const link of Array.from(doc.head.querySelectorAll(`link[${SRC_ATTR}]`))) {
    for (const src of (link.getAttribute(SRC_ATTR) ?? "").split(",")) {
      if (src) present.add(src);
    }
  }

  const batchable: { id: string; src: string; family: string }[] = [];
  const standalone: { id: string; src: string }[] = [];

  for (const font of fonts) {
    // Normalise first so documents holding a specimen-page URL self-heal
    // rather than needing an admin to re-save them.
    const href = font.googleFontUrl ? normalizeFontUrl(font.googleFontUrl) : undefined;

    if (!isAllowedFontUrl(href)) {
      if (font.googleFontUrl) {
        console.warn(
          `[fontLoader] Ignoring font "${font.name}" — ${font.googleFontUrl} is not an https URL on an allowed font CDN.`
        );
      }
      continue;
    }

    if (present.has(href)) continue;
    present.add(href);

    const families = css2Families(href);
    if (families) {
      for (const family of families) batchable.push({ id: font.id, src: href, family });
    } else {
      standalone.push({ id: font.id, src: href });
    }
  }

  let added = 0;

  const append = (href: string, ids: string[], srcs: string[]) => {
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(LINK_ATTR, ids.join(","));
    link.setAttribute(SRC_ATTR, srcs.join(","));
    doc.head.appendChild(link);
    added++;
  };

  if (batchable.length > 0) {
    // One family may appear in several batch URLs only if it was chunked; the
    // ids/srcs recorded per link are the ones that URL actually covers.
    const urls = batchCss2Urls(batchable.map((b) => b.family));
    let cursor = 0;
    for (const url of urls) {
      const count = (url.match(/[?&]family=/g) ?? []).length;
      const slice = batchable.slice(cursor, cursor + count);
      cursor += count;
      append(url, slice.map((b) => b.id), [...new Set(slice.map((b) => b.src))]);
    }
  }

  for (const { id, src } of standalone) append(src, [id], [src]);

  return added;
}
