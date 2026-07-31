import { describe, expect, test } from "vitest";
import {
  DEFAULT_FILTER_INTENSITY,
  buildDoc,
  exportFileStem,
  formatDistance,
  formatRelativeTime,
  shareCaption,
  isDocDirty,
  newProjectId,
  normalizeDoc,
  projectTitle,
  thumbnailSize,
  type EditorDocParts,
} from "./projectDoc";
import type { StatSlotId, StickerOverlay, TextOverlay } from "../types";

const TEXT: TextOverlay = {
  id: "t1",
  text: "Sunrise",
  x: 10,
  y: -20,
  color: "#FFFFFF",
  fontStyle: "Bold",
  bgStyle: "solid",
  align: "center",
  fontSize: 32,
};

const STICKER: StickerOverlay = {
  id: "s1",
  content: "BEAST MODE 🔥",
  type: "badge",
  scale: 1,
  rotation: 0,
  x: 0,
  y: 40,
};

function parts(overrides: Partial<EditorDocParts> = {}): EditorDocParts {
  return {
    textOverlays: [TEXT],
    stickerOverlays: [STICKER],
    templateId: "hero",
    statLayout: { distance: { x: 10, y: 20 } },
    statSlotOverrides: {},
    capturedImage: "data:image/jpeg;base64,AAAA",
    hiddenSlots: new Set<StatSlotId>(["pace"]),
    committedCrop: { ratio: "9:16", rotation: 0, flipH: false, flipV: false },
    isBaseImageHidden: false,
    isBaseImageLocked: false,
    baseImageZIndex: 0,
    imagePerspectiveX: 0,
    imagePerspectiveY: 0,
    imageShadowBlur: 0,
    imageShadowOffsetY: 10,
    imageShadowColor: "#000000",
    isDrawingHidden: false,
    isDrawingLocked: false,
    drawingZIndex: 30,
    drawingCanvasDataUrl: null,
    hasDrawnStrokes: false,
    routeOverlay: null,
    routeGeometry: null,
    lensFilter: "",
    filterIntensity: DEFAULT_FILTER_INTENSITY,
    statData: {
      distance: 8.4,
      distanceUnit: "km",
      pace: "6:12",
      time: "52:18",
      title: "Morning Run",
    },
    ...overrides,
  };
}

describe("buildDoc", () => {
  test("carries every editor field through", () => {
    const doc = buildDoc(parts());

    expect(doc.textOverlays).toEqual([TEXT]);
    expect(doc.stickerOverlays).toEqual([STICKER]);
    expect(doc.templateId).toBe("hero");
    expect(doc.statLayout).toEqual({ distance: { x: 10, y: 20 } });
    expect(doc.capturedImage).toBe("data:image/jpeg;base64,AAAA");
    expect(doc.committedCrop.ratio).toBe("9:16");
    expect(doc.statData.title).toBe("Morning Run");
  });

  test("carries the four fields that live outside the undo snapshot", () => {
    const doc = buildDoc(
      parts({
        lensFilter: "contrast(1.2)",
        filterIntensity: 40,
        routeGeometry: { points: [[0, 0]], length: 1 } as never,
      })
    );

    expect(doc.lensFilter).toBe("contrast(1.2)");
    expect(doc.filterIntensity).toBe(40);
    expect(doc.routeGeometry).not.toBeNull();
    expect(doc.statData.distance).toBe(8.4);
  });

  test("stores hiddenSlots as a sorted array, not Set-iteration order", () => {
    const a = buildDoc(parts({ hiddenSlots: new Set<StatSlotId>(["time", "distance"]) }));
    const b = buildDoc(parts({ hiddenSlots: new Set<StatSlotId>(["distance", "time"]) }));

    expect(a.hiddenSlots).toEqual(["distance", "time"]);
    expect(a.hiddenSlots).toEqual(b.hiddenSlots);
  });

  test("detaches from live state, so later edits cannot mutate a saved doc", () => {
    const live = [{ ...TEXT }];
    const doc = buildDoc(parts({ textOverlays: live }));

    live[0].text = "changed after save";

    expect(doc.textOverlays[0].text).toBe("Sunrise");
  });
});

describe("normalizeDoc", () => {
  test("fills missing optionals with the editor's own defaults", () => {
    const doc = normalizeDoc({ capturedImage: "photo.jpg" });

    expect(doc).not.toBeNull();
    expect(doc!.imagePerspectiveX).toBe(0);
    expect(doc!.imagePerspectiveY).toBe(0);
    expect(doc!.imageShadowBlur).toBe(0);
    expect(doc!.imageShadowOffsetY).toBe(10);
    expect(doc!.imageShadowColor).toBe("#000000");
    expect(doc!.filterIntensity).toBe(DEFAULT_FILTER_INTENSITY);
    expect(doc!.textOverlays).toEqual([]);
    expect(doc!.routeOverlay).toBeNull();
  });

  test("round-trips a document built from live state", () => {
    const built = buildDoc(parts());
    const restored = normalizeDoc(JSON.parse(JSON.stringify(built)));

    expect(restored).toEqual(built);
  });

  test("returns null when there is nothing to rebuild a canvas from", () => {
    expect(normalizeDoc(null)).toBeNull();
    expect(normalizeDoc("nope")).toBeNull();
    expect(normalizeDoc([])).toBeNull();
    expect(normalizeDoc({})).toBeNull();
    expect(normalizeDoc({ capturedImage: "" })).toBeNull();
    expect(normalizeDoc({ capturedImage: 42 })).toBeNull();
  });

  test("discards non-finite numbers rather than storing NaN", () => {
    const doc = normalizeDoc({ capturedImage: "photo.jpg", imageShadowBlur: NaN });

    expect(doc!.imageShadowBlur).toBe(0);
  });
});

describe("isDocDirty", () => {
  test("is clean against an identical document", () => {
    expect(isDocDirty(buildDoc(parts()), buildDoc(parts()))).toBe(false);
  });

  test("is dirty with no reference document", () => {
    expect(isDocDirty(buildDoc(parts()), null)).toBe(true);
  });

  test.each([
    ["a moved overlay", { textOverlays: [{ ...TEXT, x: 999 }] }],
    ["a changed template", { templateId: "newsprint" }],
    ["a toggled hidden slot", { hiddenSlots: new Set<StatSlotId>(["pace", "time"]) }],
    ["a changed filter intensity", { filterIntensity: 10 }],
    ["a changed lens filter", { lensFilter: "sepia(1)" }],
    ["a swapped background", { capturedImage: "other.jpg" }],
    ["a new sticker", { stickerOverlays: [STICKER, { ...STICKER, id: "s2" }] }],
  ] as [string, Partial<EditorDocParts>][])("is dirty after %s", (_label, change) => {
    expect(isDocDirty(buildDoc(parts(change)), buildDoc(parts()))).toBe(true);
  });

  test("ignores drawing canvas re-encoding, which differs on every read", () => {
    const saved = buildDoc(parts({ drawingCanvasDataUrl: "data:image/png;base64,AAA" }));
    const current = buildDoc(parts({ drawingCanvasDataUrl: "data:image/png;base64,BBB" }));

    expect(isDocDirty(current, saved)).toBe(false);
  });

  test("still catches a drawing being started", () => {
    const saved = buildDoc(parts({ hasDrawnStrokes: false }));
    const current = buildDoc(parts({ hasDrawnStrokes: true }));

    expect(isDocDirty(current, saved)).toBe(true);
  });
});

describe("projectTitle", () => {
  test("uses the activity name", () => {
    expect(projectTitle({ ...parts().statData, title: "Golden Gate Trail" })).toBe(
      "Golden Gate Trail"
    );
  });

  test("falls back to Untitled for empty or whitespace names", () => {
    expect(projectTitle({ ...parts().statData, title: "" })).toBe("Untitled");
    expect(projectTitle({ ...parts().statData, title: "   " })).toBe("Untitled");
  });
});

describe("newProjectId", () => {
  test("does not collide within the same millisecond", () => {
    const ids = new Set(Array.from({ length: 200 }, newProjectId));
    expect(ids.size).toBe(200);
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-07-30T12:00:00Z");

  function ago(ms: number): string {
    return new Date(NOW.getTime() - ms).toISOString();
  }

  test("reads fresh saves as just now", () => {
    expect(formatRelativeTime(ago(5_000), NOW)).toBe("just now");
  });

  test("singularises one, pluralises the rest", () => {
    expect(formatRelativeTime(ago(60_000), NOW)).toBe("1 min ago");
    expect(formatRelativeTime(ago(10 * 60_000), NOW)).toBe("10 mins ago");
    expect(formatRelativeTime(ago(3600_000), NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(ago(5 * 3600_000), NOW)).toBe("5 hours ago");
    expect(formatRelativeTime(ago(86400_000), NOW)).toBe("1 day ago");
    expect(formatRelativeTime(ago(3 * 86400_000), NOW)).toBe("3 days ago");
  });

  test("falls back to a calendar date beyond a week", () => {
    const out = formatRelativeTime(ago(30 * 86400_000), NOW);
    expect(out).not.toMatch(/ago/);
  });

  test("survives a clock skew that puts a save in the future", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 60_000).toISOString(), NOW)).toBe(
      "just now"
    );
  });

  test("degrades rather than throwing on an unparseable timestamp", () => {
    expect(formatRelativeTime("not a date", NOW)).toBe("recently");
    expect(formatRelativeTime("", NOW)).toBe("recently");
  });
});

describe("formatDistance", () => {
  test("pairs the value with its unit", () => {
    expect(formatDistance({ ...parts().statData, distance: 8.4, distanceUnit: "km" })).toBe(
      "8.4 km"
    );
  });

  test("shows an em dash rather than the old literal '-' for no distance", () => {
    expect(formatDistance({ ...parts().statData, distance: 0 })).toBe("—");
  });
});

describe("shareCaption", () => {
  test("uses the activity instead of a generic message", () => {
    expect(shareCaption(parts().statData)).toBe("8.4 km · 6:12/km · 52:18 — Morning Run");
  });

  test("drops parts it does not have rather than sharing dashes", () => {
    expect(shareCaption({ ...parts().statData, pace: "—", time: "—" })).toBe(
      "8.4 km — Morning Run"
    );
  });

  test("falls back to the title alone when there are no numbers", () => {
    expect(
      shareCaption({ distance: 0, distanceUnit: "km", pace: "—", time: "—", title: "Rest Day" })
    ).toBe("Rest Day");
  });

  test("follows the unit through to pace", () => {
    const imperial = { ...parts().statData, distanceUnit: "mi", pace: "9:58" };
    expect(shareCaption(imperial)).toContain("9:58/mi");
  });
});

describe("exportFileStem", () => {
  test("slugifies the activity name", () => {
    expect(exportFileStem({ ...parts().statData, title: "Morning Run" })).toBe("morning-run");
  });

  test("strips emoji and punctuation that filesystems dislike", () => {
    expect(exportFileStem({ ...parts().statData, title: "Golden Gate 🌉 Trail!" })).toBe(
      "golden-gate-trail"
    );
  });

  test("never returns an empty stem", () => {
    expect(exportFileStem({ ...parts().statData, title: "🌉" })).toBe("stride-export");
    expect(exportFileStem({ ...parts().statData, title: "" })).toBe("untitled");
  });
});

describe("thumbnailSize", () => {
  test("caps the long edge at 320px for every ratio", () => {
    for (const ratio of ["9:16", "1:1", "4:5", "16:9"]) {
      const { width, height } = thumbnailSize(ratio);
      expect(Math.max(width, height)).toBe(320);
    }
  });

  test("keeps portrait portrait and landscape landscape", () => {
    expect(thumbnailSize("9:16").height).toBeGreaterThan(thumbnailSize("9:16").width);
    expect(thumbnailSize("16:9").width).toBeGreaterThan(thumbnailSize("16:9").height);
    expect(thumbnailSize("1:1").width).toBe(thumbnailSize("1:1").height);
  });

  test("treats an unknown ratio as the editor's default portrait canvas", () => {
    expect(thumbnailSize("weird")).toEqual(thumbnailSize("9:16"));
  });
});
