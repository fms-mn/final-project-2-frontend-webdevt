// Reviewing a scheduling plan before it is saved. The server checks the plan (a dry run) and says
// which showings are ready and which clash with something. The admin settles each clash by moving
// it to the next free time, using another room, or skipping it. These helpers keep that bookkeeping
// out of the screen: the counts, the list to save, and the plain-words reason for a clash.
import { displayTime, minutesOfDay } from './manila.js';

// One showing in a plan is told apart by its start and its room.
export const slotKey = (item) => `${new Date(item.startTime).toISOString()}|${item.auditorium}`;

const clashesOf = (result) => (result?.skipped || []).filter((item) => item.kind === 'clash');

// What the admin has settled, and what is still waiting. `collisions` holds the keys of fixes that
// no longer fit (two fixes landing on the same time, for example): they count as undecided.
export function planCounts(result, decisions = {}, collisions = new Set()) {
  const clashes = clashesOf(result);
  let fixed = 0;
  let skippedByAdmin = 0;
  let open = 0;
  for (const item of clashes) {
    const decision = decisions[slotKey(item)];
    if (!decision) open += 1;
    else if (decision.type === 'skip') skippedByAdmin += 1;
    else if (collisions.has(fixedKey(item, decision))) open += 1;
    else fixed += 1;
  }
  const leftOut = (result?.skipped || []).length - clashes.length;
  const ready = result?.createdCount || 0;
  return { ready, open, fixed, skipped: skippedByAdmin + leftOut, total: ready + fixed };
}

// Where a settled clash ends up: the same room at a new time, or the same time in another room.
export function fixedSlot(item, decision) {
  return {
    movie: item.movie,
    auditorium: decision.type === 'room' ? decision.room : item.auditorium,
    startTime: decision.type === 'time' ? decision.start : new Date(item.startTime).toISOString(),
    ticketPrice: item.ticketPrice,
    published: item.published,
  };
}
export const fixedKey = (item, decision) => slotKey(fixedSlot(item, decision));

// Everything that will be saved: the ready showings and the fixed ones. Skipped ones are left out.
export function slotsToSave(result, decisions = {}) {
  const ready = (result?.created || []).map((item) => ({
    movie: item.movie, auditorium: item.auditorium, startTime: new Date(item.startTime).toISOString(), ticketPrice: item.ticketPrice, published: item.published,
  }));
  const fixed = clashesOf(result)
    .map((item) => [item, decisions[slotKey(item)]])
    .filter(([, decision]) => decision && decision.type !== 'skip')
    .map(([item, decision]) => fixedSlot(item, decision));
  return [...ready, ...fixed];
}

// Where the fixes already chosen put their showings, so the next fix keeps clear of them.
// `minutesOf(movieId)` is the length of a movie.
export function occupied(result, decisions = {}, minutesOf = () => 90) {
  return clashesOf(result)
    .map((item) => [item, decisions[slotKey(item)]])
    .filter(([, decision]) => decision && decision.type !== 'skip')
    .map(([item, decision]) => {
      const slot = fixedSlot(item, decision);
      const start = new Date(slot.startTime).getTime();
      return { key: slotKey(item), auditorium: String(slot.auditorium), start, end: start + minutesOf(item.movie) * 60000 };
    });
}

const overlaps = (taken, auditorium, start, end, gapMinutes, ignoreKey) => taken.some((other) => other.key !== ignoreKey
  && other.auditorium === String(auditorium)
  && other.start < end + gapMinutes * 60000 && other.end > start - gapMinutes * 60000);

// The first free time for a clash that does not run into a fix chosen for another clash.
export function pickTime(item, taken, { minutes, gapMinutes }) {
  const times = item.fixes?.times || (item.fixes?.nextFree ? [item.fixes.nextFree] : []);
  const free = times.find((time) => {
    const start = new Date(time).getTime();
    return !overlaps(taken, item.auditorium, start, start + minutes * 60000, gapMinutes, slotKey(item));
  });
  return free ? new Date(free).toISOString() : null;
}

// The other rooms offered for a clash, minus any a different fix already fills at that time.
export function pickRooms(item, taken, { minutes, gapMinutes }) {
  const start = new Date(item.startTime).getTime();
  return (item.fixes?.rooms || []).filter((room) => !overlaps(taken, room._id, start, start + minutes * 60000, gapMinutes, slotKey(item)));
}

// "Use the next free time" for every clash waiting, one after the other, so two clashes never take
// the same time. Clashes with no free time left stay undecided.
export function applyNextFree(result, decisions = {}, { minutesOf = () => 90, gapMinutes = 15 } = {}) {
  const next = { ...decisions };
  const waiting = clashesOf(result).filter((item) => !next[slotKey(item)]).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  for (const item of waiting) {
    const time = pickTime(item, occupied(result, next, minutesOf), { minutes: minutesOf(item.movie), gapMinutes });
    if (time) next[slotKey(item)] = { type: 'time', start: time };
  }
  return next;
}

// Skips every clash still waiting, including fixes that collided and need another answer.
export function skipAllClashes(result, decisions = {}, collisions = new Set()) {
  const next = { ...decisions };
  for (const item of clashesOf(result)) {
    const decision = next[slotKey(item)];
    if (!decision || (decision.type !== 'skip' && collisions.has(fixedKey(item, decision)))) next[slotKey(item)] = { type: 'skip' };
  }
  return next;
}

const clock = (value) => displayTime(value);
const minutesBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / 60000);

// Why the time clashes, in the words an admin would use. `movieMinutes` is the length of the movie
// being scheduled; `gapMinutes` is the room's reset time.
export function describeClash(item, { roomName, movieTitle, movieMinutes, gapMinutes }) {
  const clash = item.clash;
  if (!clash) return item.reason;
  const start = new Date(item.startTime);
  const end = new Date(start.getTime() + movieMinutes * 60000);
  const ownTime = `${movieTitle} at ${clock(start)}`;
  const theirs = clash.inRequest ? `another showing in this plan (${clock(clash.startTime)})` : `${clash.title} (${clock(clash.startTime)} to ${clock(clash.endTime)})`;
  if (start < new Date(clash.endTime) && end > new Date(clash.startTime)) {
    return `${roomName} is busy: ${ownTime} would overlap ${theirs}.`;
  }
  if (start >= new Date(clash.endTime)) {
    const early = gapMinutes - minutesBetween(clash.endTime, start);
    return `${roomName} is busy: ${clash.inRequest ? 'another showing in this plan' : clash.title} runs until ${clock(clash.endTime)} and the room needs ${gapMinutes} minutes to reset, so ${ownTime} would start ${early} minute${early === 1 ? '' : 's'} too early.`;
  }
  const late = gapMinutes - minutesBetween(end, clash.startTime);
  return `${roomName}: ${ownTime} would end ${late} minute${late === 1 ? '' : 's'} too close to ${theirs}, and the room needs ${gapMinutes} minutes to reset.`;
}

// The time window drawn for one clash, in minutes of the day, one hour of padding each side.
export function clashWindow(item, movieMinutes, moved = null) {
  const startA = minutesOfDay(item.clash.startTime);
  const endA = startA + minutesBetween(item.clash.startTime, item.clash.endTime);
  const startB = minutesOfDay(moved || item.startTime);
  const endB = startB + movieMinutes;
  const from = Math.floor((Math.min(startA, startB) - 60) / 60) * 60;
  const to = Math.ceil((Math.max(endA, endB) + 60) / 60) * 60;
  return { from, to, existing: [startA, endA], proposed: [startB, endB] };
}
