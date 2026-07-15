/**
 * Shared imperial-table seating logic.
 * Given a capacity and a set of seat_position values (with optional payload T),
 * returns an array of length `capacity` where positioned entries land at their
 * seat_position and the rest fill the first free seats in order.
 *
 * This is the single source of truth for the desktop SVG, the mobile sheet
 * and the PDF export — so Elena Picalarga (and every other guest with a null
 * seat_position) ends up in the same seat everywhere.
 */
export function buildImperialSeats<T extends { seat_position?: number | null }>(
  items: T[],
  capacity: number,
): (T | null)[] {
  const seats: (T | null)[] = Array.from({ length: capacity }, () => null);
  const unpositioned: T[] = [];
  items.forEach((it) => {
    const p = it.seat_position;
    if (typeof p === "number" && p >= 0 && p < capacity && !seats[p]) {
      seats[p] = it;
    } else {
      unpositioned.push(it);
    }
  });
  for (let i = 0; i < capacity && unpositioned.length > 0; i++) {
    if (!seats[i]) seats[i] = unpositioned.shift()!;
  }
  return seats;
}
