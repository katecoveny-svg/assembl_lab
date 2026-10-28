// Conservative footprints shared by pointer placement, project validation and keyboard navigation.
export function footprint(size, shape) {
  return size * (shape === "marquise" ? 1.4 : 1.1);
}
export function insideBoundary(mode, stone) {
  const r = footprint(stone.size, stone.shape);
  return mode === "board"
    ? Math.abs(stone.x) + r <= 1.65 && Math.abs(stone.y) + r <= 2
    : (stone.x / (1.25 - r)) ** 2 + (stone.y / (1.75 - r)) ** 2 <= 0.94;
}
export function constrainCursor(mode, position, size, shape) {
  const r = footprint(size, shape);
  // A tiny inset avoids floating-point rejection of a cursor exactly on the boundary.
  const inset = 1e-8;
  if (mode === "board")
    return {
      x: Math.max(-1.65 + r + inset, Math.min(1.65 - r - inset, position.x)),
      y: Math.max(-2 + r + inset, Math.min(2 - r - inset, position.y)),
    };
  const a = 1.25 - r,
    b = 1.75 - r;
  const distance = Math.hypot(position.x / a, position.y / b);
  const scale =
    distance > Math.sqrt(0.94) - inset
      ? (Math.sqrt(0.94) - inset) / distance
      : 1;
  return { x: position.x * scale, y: position.y * scale };
}
