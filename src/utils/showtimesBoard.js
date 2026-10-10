export function showingStatus(showing, now = new Date()) {
  if (showing.status?.toLowerCase() === 'cancelled') return 'CANCELLED';
  if (new Date(showing.startTime) <= now) return 'STARTED';
  if ((showing.remainingSeats ?? 0) <= 0) return 'SOLD OUT';
  return showing.remainingSeats <= 10 ? 'FEW SEATS' : 'OPEN';
}

export function groupShowtimesByTime(rows) {
  const groups = new Map();
  for (const row of [...rows].sort((a, b) => a.time.localeCompare(b.time))) {
    if (!groups.has(row.time)) groups.set(row.time, { time: row.time, showings: [] });
    groups.get(row.time).showings.push(row);
  }
  return [...groups.values()];
}

export const isBookableShowing = row => row.seats > 0 && (row.status === 'OPEN' || row.status === 'FEW SEATS');

export function groupShowtimesByMovie(rows) {
  const groups = new Map();
  for (const row of [...rows].sort((a,b) => a.time.localeCompare(b.time))) {
    const id = row.movie._id;
    if (!groups.has(id)) groups.set(id, { movie: row.movie, showings: [] });
    groups.get(id).showings.push(row);
  }
  return [...groups.values()];
}
