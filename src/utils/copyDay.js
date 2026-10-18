import { fixedSlot, occupied, pickRooms, pickTime, slotKey } from './planReview.js';

export function copyOccupied(result, decisions, minutesOf) {
  return [
    ...result.created.map((item) => {
      const start = new Date(item.startTime).getTime();
      return { key: `ready:${slotKey(item)}`, auditorium: String(item.auditorium), start, end: start + minutesOf(item.movie) * 60000 };
    }),
    ...occupied(result, decisions, minutesOf),
  ];
}

export function suggestCopyFixes(result, decisions, { minutesOf, gapMinutes }) {
  const next = { ...decisions };
  const waiting = result.skipped.filter(item => item.kind === 'clash' && !next[slotKey(item)])
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  for (const item of waiting) {
    const taken = copyOccupied(result, next, minutesOf);
    const rules = { minutes: minutesOf(item.movie), gapMinutes };
    const time = pickTime(item, taken, rules);
    const rooms = pickRooms(item, taken, rules);
    const shift = time ? new Date(time) - new Date(item.startTime) : Infinity;
    if (time && (shift <= 30 * 60000 || !rooms.length)) next[slotKey(item)] = { type: 'time', start: time };
    else if (rooms.length) next[slotKey(item)] = { type: 'room', room: String(rooms[0]._id) };
  }
  return next;
}

// Keep earlier choices when fresh availability reports a new conflict. Only affected copies
// become undecided again; existing showings are never part of this plan.
export function refreshCopyPlan(result, decisions, check) {
  const failures = new Map(check.skipped.map(item => [slotKey(item), item]));
  const next = { ...decisions };
  const skipped = [];
  const created = [];
  for (const item of result.created) {
    const failure = failures.get(slotKey(item));
    if (failure) skipped.push(failure); else created.push(item);
  }
  for (const item of result.skipped) {
    const decision = decisions[slotKey(item)];
    const effective = decision && decision.type !== 'skip' ? fixedSlot(item, decision) : item;
    const failure = decision?.type !== 'skip' && failures.get(slotKey(effective));
    if (failure) {
      delete next[slotKey(item)];
      skipped.push(failure);
    } else skipped.push(item);
  }
  return { result: { ...result, created, createdCount: created.length, skipped, skippedCount: skipped.length }, decisions: next };
}

export function copyOutcome(done, planned, skipped) {
  const created = done.created?.length || 0;
  const failed = Math.max(0, planned - created);
  return { created, skipped, failed, complete: failed === 0 };
}
