/**
 * Resolve a dynamic sticker's content from activity stat data.
 *
 * A sticker with a `format` template interpolates runtime data values.
 * If no `format` is set, falls back to the static `content` field.
 */

export interface StatValue {
  raw: string | number;
  label: string;
  unit: string;
}

/** Known stat metadata — label + unit for common keys. */
const STAT_META: Record<string, { label: string; unit: string }> = {
  distance:     { label: "Distance", unit: "KM" },
  pace:         { label: "Pace", unit: "/KM" },
  time:         { label: "Time", unit: "" },
  title:        { label: "Activity", unit: "" },
  avg_hr:       { label: "Heart Rate", unit: "bpm" },
  max_hr:       { label: "Max HR", unit: "bpm" },
  elev_gain:    { label: "Elevation", unit: "m" },
  elev_loss:    { label: "Descent", unit: "m" },
  speed:        { label: "Speed", unit: "km/h" },
  avg_speed:    { label: "Avg Speed", unit: "km/h" },
  max_speed:    { label: "Max Speed", unit: "km/h" },
  cadence:      { label: "Cadence", unit: "spm" },
  avg_cadence:  { label: "Avg Cadence", unit: "spm" },
  calories:     { label: "Calories", unit: "kcal" },
  power:        { label: "Power", unit: "W" },
  avg_power:    { label: "Avg Power", unit: "W" },
  max_power:    { label: "Max Power", unit: "W" },
  temp:         { label: "Temp", unit: "°C" },
  humidity:     { label: "Humidity", unit: "%" },
};

/** Round a number to N decimal places. */
function round(val: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  return String(Math.round(val * factor) / factor);
}

/** Format a stat value for display. */
function fmt(
  value: string | number | undefined,
  decimals = 1,
): string {
  if (value === undefined || value === null) return "--";
  if (typeof value === "number") {
    // large numbers → integer, small → decimals
    return value >= 100 ? String(Math.round(value)) : round(value, decimals);
  }
  return value;
}

/**
 * Build a StatValue from a stat key and raw data object.
 * Accepts any object shape; unknown keys return the value with generic labels.
 */
export function getStatValue(
  statKey: string,
  data: Record<string, string | number | undefined>,
): StatValue {
  const raw = data[statKey];
  const meta = STAT_META[statKey];
  return {
    raw: raw ?? "--",
    label: meta?.label ?? statKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    unit: meta?.unit ?? "",
  };
}

/**
 * Resolve a sticker's display content given activity data.
 *
 * @param content  — Static fallback content.
 * @param format   — Format template like "❤️ {value} bpm".
 * @param statKey  — Key into `data` (optional — if absent, returns content as-is).
 * @param data     — Activity stat data object.
 * @returns The resolved display string.
 */
export function resolveStickerContent(
  content: string,
  format: string | undefined,
  statKey: string | undefined,
  data: Record<string, string | number | undefined>,
): string {
  if (!statKey) return content;
  if (!format) return content;

  const sv = getStatValue(statKey, data);
  const resolved = format
    .replace(/\{value\}/g, fmt(sv.raw))
    .replace(/\{label\}/g, sv.label)
    .replace(/\{unit\}/g, sv.unit);

  return resolved;
}
