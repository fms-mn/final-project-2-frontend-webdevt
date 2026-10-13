// Does a showing that starts at `startMs` and ends at `endMs` collide with one already on the
// schedule in the same room? Two showings need `gapMinutes` between them (cleaning and changeover),
// the same rule the server enforces. The server stays the judge; this lets the screen warn early.
export function findClash(existing, { auditorium, startMs, endMs, gapMinutes = 0, ignoreId = '' }) {
  const gap = gapMinutes * 60 * 1000;
  return existing.find((row) => {
    if (row.status !== 'scheduled' || row._id === ignoreId) return false;
    if ((row.auditorium?._id ?? row.auditorium) !== auditorium) return false;
    const start = new Date(row.startTime).getTime();
    const end = new Date(row.endTime).getTime();
    return start < endMs + gap && end > startMs - gap;
  }) || null;
}
