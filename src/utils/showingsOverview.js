// What the Showings screen tells the admin at a glance: what is wrong, how busy each day is,
// and what state a single showing is in.

// Things worth fixing, shown above the schedule. `movies` are the admin's movies (with the showing
// counts the server adds). A draft that already has showings is invisible to customers until it is
// published; a released movie with nothing left to book shows "No showings" on the site.
export function attentionItems(movies = []) {
  const items = [];
  for (const movie of movies) {
    if (movie.status === 'draft' && (movie.upcomingShowings ?? 0) > 0) {
      items.push({ kind: 'draft', movie, count: movie.upcomingShowings });
    }
  }
  for (const movie of movies) {
    if (movie.status === 'published' && movie.showStatus === 'not_showing') {
      items.push({ kind: 'empty', movie });
    }
  }
  return items;
}

// The numbers on a day's chip. Cancelled showings no longer count as shows.
export function dayFacts(rows = []) {
  const scheduled = rows.filter((row) => row.status === 'scheduled');
  return {
    scheduled: scheduled.length,
    hidden: scheduled.filter((row) => !row.published).length,
    cancelled: rows.length - scheduled.length,
  };
}

// 'cancelled' | 'started' | 'hidden' | 'on-sale'. A showing of a draft movie is hidden even when its
// own switch is on, because customers cannot see a draft movie at all.
export function showingState(row, { movieStatus, now = new Date() } = {}) {
  if (row.status !== 'scheduled') return 'cancelled';
  if (new Date(row.startTime) <= now) return 'started';
  if (!row.published || movieStatus === 'draft') return 'hidden';
  return 'on-sale';
}

export const seatsSold = (row) => Math.max(0, (row.totalSeats ?? 0) - (row.remainingSeats ?? 0));

// How far along a room's row (0 to 1) a time falls, for placing the hover marker.
export function fractionOfDay(clock, fromHour, toHour) {
  const [hours, minutes] = clock.split(':').map(Number);
  return ((hours * 60 + minutes) - fromHour * 60) / ((toHour - fromHour) * 60);
}
