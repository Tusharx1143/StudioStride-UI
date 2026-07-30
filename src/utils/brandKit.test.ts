import { describe, expect, test } from "vitest";
import {
  EMPTY_KIT,
  MAX_CUSTOM_COLORS,
  MAX_PRESETS,
  MAX_RECENT_TEMPLATES,
  addCustomColor,
  addPreset,
  isFavouriteTemplate,
  newPresetId,
  normalizeKit,
  pushRecentTemplate,
  removeCustomColor,
  removePreset,
  toggleFavouriteTemplate,
  type BrandKit,
  type StylePreset,
} from "./brandKit";

function preset(id: string): StylePreset {
  return {
    id,
    name: `Preset ${id}`,
    createdAt: "2026-07-30T12:00:00.000Z",
    templateId: "hero",
    statLayout: { distance: { x: 10, y: 20 } },
    hiddenSlots: [],
    lensFilter: "contrast(1.2)",
    filterIntensity: 80,
    textColor: "#FFFFFF",
  };
}

describe("recent templates", () => {
  test("puts the newest first", () => {
    let kit = pushRecentTemplate(EMPTY_KIT, "hero");
    kit = pushRecentTemplate(kit, "editorial");
    expect(kit.recentTemplates).toEqual(["editorial", "hero"]);
  });

  test("promotes rather than duplicates a re-used template", () => {
    let kit = pushRecentTemplate(EMPTY_KIT, "hero");
    kit = pushRecentTemplate(kit, "editorial");
    kit = pushRecentTemplate(kit, "hero");
    expect(kit.recentTemplates).toEqual(["hero", "editorial"]);
  });

  test("caps the list so the strip stays scannable", () => {
    let kit = EMPTY_KIT;
    for (let i = 0; i < MAX_RECENT_TEMPLATES + 5; i++) {
      kit = pushRecentTemplate(kit, `t${i}`);
    }
    expect(kit.recentTemplates).toHaveLength(MAX_RECENT_TEMPLATES);
    expect(kit.recentTemplates[0]).toBe(`t${MAX_RECENT_TEMPLATES + 4}`);
  });
});

describe("favourites", () => {
  test("toggles on and off", () => {
    let kit = toggleFavouriteTemplate(EMPTY_KIT, "hero");
    expect(isFavouriteTemplate(kit, "hero")).toBe(true);

    kit = toggleFavouriteTemplate(kit, "hero");
    expect(isFavouriteTemplate(kit, "hero")).toBe(false);
  });

  test("keeps other favourites when one is removed", () => {
    let kit = toggleFavouriteTemplate(EMPTY_KIT, "hero");
    kit = toggleFavouriteTemplate(kit, "editorial");
    kit = toggleFavouriteTemplate(kit, "hero");
    expect(kit.favouriteTemplates).toEqual(["editorial"]);
  });
});

describe("custom colours", () => {
  test("adds a swatch, newest first", () => {
    let kit = addCustomColor(EMPTY_KIT, "#FF7A1A");
    kit = addCustomColor(kit, "#00FF00");
    expect(kit.customColors).toEqual(["#00FF00", "#FF7A1A"]);
  });

  test("treats case as the same colour", () => {
    let kit = addCustomColor(EMPTY_KIT, "#FF7A1A");
    kit = addCustomColor(kit, "#ff7a1a");
    expect(kit.customColors).toEqual(["#FF7A1A"]);
  });

  test("rejects anything that is not a six-digit hex", () => {
    expect(addCustomColor(EMPTY_KIT, "red").customColors).toEqual([]);
    expect(addCustomColor(EMPTY_KIT, "#FFF").customColors).toEqual([]);
    expect(addCustomColor(EMPTY_KIT, "").customColors).toEqual([]);
  });

  test("caps the palette", () => {
    let kit = EMPTY_KIT;
    for (let i = 0; i < MAX_CUSTOM_COLORS + 4; i++) {
      kit = addCustomColor(kit, `#${i.toString(16).padStart(6, "0")}`);
    }
    expect(kit.customColors).toHaveLength(MAX_CUSTOM_COLORS);
  });

  test("removes case-insensitively", () => {
    const kit = addCustomColor(EMPTY_KIT, "#FF7A1A");
    expect(removeCustomColor(kit, "#ff7a1a").customColors).toEqual([]);
  });
});

describe("presets", () => {
  test("adds newest first", () => {
    let kit = addPreset(EMPTY_KIT, preset("a"));
    kit = addPreset(kit, preset("b"));
    expect(kit.presets.map((p) => p.id)).toEqual(["b", "a"]);
  });

  test("drops the oldest rather than failing at the cap", () => {
    let kit = EMPTY_KIT;
    for (let i = 0; i < MAX_PRESETS + 3; i++) kit = addPreset(kit, preset(`p${i}`));
    expect(kit.presets).toHaveLength(MAX_PRESETS);
    expect(kit.presets.some((p) => p.id === "p0")).toBe(false);
  });

  test("removes by id", () => {
    let kit = addPreset(EMPTY_KIT, preset("a"));
    kit = addPreset(kit, preset("b"));
    expect(removePreset(kit, "a").presets.map((p) => p.id)).toEqual(["b"]);
  });

  test("ids do not collide within a millisecond", () => {
    const ids = new Set(Array.from({ length: 200 }, newPresetId));
    expect(ids.size).toBe(200);
  });
});

describe("normalizeKit", () => {
  test("returns an empty kit for junk", () => {
    expect(normalizeKit(null)).toEqual(EMPTY_KIT);
    expect(normalizeKit("nope")).toEqual(EMPTY_KIT);
    expect(normalizeKit(42)).toEqual(EMPTY_KIT);
  });

  test("fills missing fields rather than throwing", () => {
    expect(normalizeKit({})).toEqual(EMPTY_KIT);
  });

  test("round-trips a real kit", () => {
    const kit: BrandKit = {
      presets: [preset("a")],
      favouriteTemplates: ["hero"],
      recentTemplates: ["hero", "editorial"],
      customColors: ["#FF7A1A"],
    };
    expect(normalizeKit(JSON.parse(JSON.stringify(kit)))).toEqual(kit);
  });

  test("discards malformed colours and presets", () => {
    const kit = normalizeKit({
      presets: [{ nope: true }, preset("a")],
      customColors: ["#FF7A1A", "red", 42],
      favouriteTemplates: ["hero", "hero"],
    });
    expect(kit.presets.map((p) => p.id)).toEqual(["a"]);
    expect(kit.customColors).toEqual(["#FF7A1A"]);
    expect(kit.favouriteTemplates).toEqual(["hero"]);
  });
});
