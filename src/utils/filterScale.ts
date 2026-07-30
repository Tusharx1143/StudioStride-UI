/**
 * Scales a CSS filter string toward "no filter".
 *
 * The intensity slider used to only work when no named lens was selected: it
 * rewrote `lensFilter` with a hand-rolled contrast/saturate pair, so picking
 * Cyberpunk or Vintage left the slider updating its own percentage label and
 * nothing else. Worse, dragging it with nothing selected *created* a filter,
 * so "None" stopped meaning none.
 *
 * The fix is to keep the lens as a named base and compose at render time:
 * every filter function is interpolated toward its identity value, so amount 1
 * is the lens as designed and amount 0 is genuinely no filter.
 */

/** Identity value per filter function — what "no effect" means for each. */
const IDENTITY: Record<string, number> = {
  contrast: 1,
  saturate: 1,
  brightness: 1,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  opacity: 1,
  blur: 0,
  "hue-rotate": 0,
};

/** `contrast(1.15)`, `sepia(40%)`, `hue-rotate(-15deg)`, `blur(2px)`. */
const FUNCTION_PATTERN = /([a-z-]+)\(\s*(-?[\d.]+)\s*([a-z%]*)\s*\)/gi;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

/** Trims float noise so `contrast(1.0750000000000002)` doesn't reach the DOM. */
function tidy(value: number): string {
  return String(Math.round(value * 1e4) / 1e4);
}

/**
 * @param base   A CSS filter string, e.g. `"sepia(0.4) contrast(0.9)"`.
 * @param amount 0 = no filter, 1 = the base exactly. Clamped.
 * @returns A filter string, or `""` when the result is a no-op.
 */
export function scaleFilter(base: string, amount: number): string {
  if (!base) return "";

  const t = clamp01(amount);
  if (t === 1) return base;
  if (t === 0) return "";

  const parts: string[] = [];

  for (const match of base.matchAll(FUNCTION_PATTERN)) {
    const [, rawName, rawValue, unit] = match;
    const name = rawName.toLowerCase();
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;

    // A percentage expresses the same quantity on a 0–100 scale, so the
    // identity has to be scaled to match before interpolating.
    const scale = unit === "%" ? 100 : 1;
    const identity = (IDENTITY[name] ?? 0) * scale;

    const scaled = identity + (value - identity) * t;
    parts.push(`${name}(${tidy(scaled)}${unit})`);
  }

  if (parts.length === 0) return "";

  // Everything landed back on its identity — that is not a filter.
  const isNoOp = parts.every((part) => {
    const m = /([a-z-]+)\(\s*(-?[\d.]+)\s*([a-z%]*)\s*\)/i.exec(part);
    if (!m) return false;
    const identity = (IDENTITY[m[1].toLowerCase()] ?? 0) * (m[3] === "%" ? 100 : 1);
    return Number(m[2]) === identity;
  });

  return isNoOp ? "" : parts.join(" ");
}
