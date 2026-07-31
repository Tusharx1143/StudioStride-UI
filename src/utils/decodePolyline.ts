/**
 * Decoder for Google's encoded-polyline format, which Strava uses for
 * `activity.map.summary_polyline`.
 *
 * Returns `null` rather than throwing on anything unusable — a malformed
 * string from the API must never take out the whole activity list.
 */

/** Decoded `[latitude, longitude]` pairs, or `null` if the input is unusable. */
export function decodePolyline(encoded: string): [number, number][] | null {
  if (!encoded) return null;

  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    const deltas: number[] = [];

    // Each point is a latitude delta followed by a longitude delta.
    for (let axis = 0; axis < 2; axis++) {
      let result = 0;
      let shift = 0;
      let terminated = false;

      while (index < encoded.length) {
        const byte = encoded.charCodeAt(index++) - 63;
        // Encoded characters live in 63..126, so byte must land in 0..63.
        if (byte < 0 || byte > 63) return null;

        result |= (byte & 0x1f) << shift;
        shift += 5;

        // The continuation bit clear means this value is complete.
        if (byte < 0x20) {
          terminated = true;
          break;
        }
      }

      // Ran off the end mid-value, or a latitude with no longitude to pair it.
      if (!terminated) return null;

      // Values are zigzag-encoded: the low bit carries the sign.
      deltas.push(result & 1 ? ~(result >> 1) : result >> 1);
    }

    lat += deltas[0];
    lng += deltas[1];
    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}
