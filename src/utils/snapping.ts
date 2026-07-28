export interface SnapRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SnapLine {
  axis: "x" | "y";
  /** Canvas-local pixel position of the line. */
  position: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapLine[];
}

/**
 * Alignment candidates: the canvas centre and gutters, plus the edges and
 * centre of every other element already on the canvas.
 */
export function buildSnapLines(
  canvas: { width: number; height: number },
  gutter: number,
  peers: SnapRect[]
): SnapLine[] {
  const lines: SnapLine[] = [
    { axis: "x", position: gutter },
    { axis: "x", position: canvas.width / 2 },
    { axis: "x", position: canvas.width - gutter },
    { axis: "y", position: gutter },
    { axis: "y", position: canvas.height / 2 },
    { axis: "y", position: canvas.height - gutter },
  ];

  for (const peer of peers) {
    lines.push({ axis: "x", position: peer.left });
    lines.push({ axis: "x", position: peer.left + peer.width / 2 });
    lines.push({ axis: "x", position: peer.left + peer.width });
    lines.push({ axis: "y", position: peer.top });
    lines.push({ axis: "y", position: peer.top + peer.height / 2 });
    lines.push({ axis: "y", position: peer.top + peer.height });
  }

  return lines;
}

/**
 * Nudges a dragged rect onto the nearest alignment line per axis, if one is
 * within the threshold. Returns the delta to apply and the lines to draw.
 */
export function computeSnap(
  rect: SnapRect,
  lines: SnapLine[],
  threshold: number
): SnapResult {
  if (threshold <= 0) return { dx: 0, dy: 0, guides: [] };

  const x = nearest(
    [rect.left, rect.left + rect.width / 2, rect.left + rect.width],
    lines.filter((l) => l.axis === "x"),
    threshold
  );
  const y = nearest(
    [rect.top, rect.top + rect.height / 2, rect.top + rect.height],
    lines.filter((l) => l.axis === "y"),
    threshold
  );

  const guides: SnapLine[] = [];
  if (x.line) guides.push(x.line);
  if (y.line) guides.push(y.line);

  return { dx: x.delta, dy: y.delta, guides };
}

function nearest(
  edges: number[],
  lines: SnapLine[],
  threshold: number
): { delta: number; line: SnapLine | null } {
  let best: { delta: number; line: SnapLine | null; distance: number } = {
    delta: 0,
    line: null,
    distance: Infinity,
  };

  for (const line of lines) {
    for (const edge of edges) {
      const distance = Math.abs(line.position - edge);
      if (distance <= threshold && distance < best.distance) {
        best = { delta: line.position - edge, line, distance };
      }
    }
  }

  return { delta: best.delta, line: best.line };
}
