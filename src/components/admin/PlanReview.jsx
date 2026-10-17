import { useEffect, useMemo, useState } from 'react';
import { apiAll } from '../../api';
import { displayTime, manilaDay, minutesOfDay, shortDate } from '../../utils/manila';
import { movieColor } from '../../utils/schedule';
import {
  autoResolve, clashWindow, describeClash, fixedKey, fixedSlot, occupied, pickRooms, pickTime, planCounts, skipAllClashes, slotKey,
} from '../../utils/planReview';
import './planReview.css';

const plural = (count, word) => `${count} ${count === 1 ? word : word === 'clash' ? 'clashes' : `${word}s`}`;
const clockLabel = (minutes) => {
  const hour = Math.floor(minutes / 60) % 24;
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
};
const dayLabel = (day) => shortDate(`${day}T12:00:00+08:00`);

// The checked plan, as the admin reads it: what is ready, what clashes and how to fix each clash,
// and a picture of one day on the room timeline. It never saves anything; the planner does.
export default function PlanReview({ result, decisions, setDecisions, collisions, gapMinutes, rooms, movies, compact = false }) {
  const counts = planCounts(result, decisions, collisions);
  const clashes = result.skipped.filter((item) => item.kind === 'clash');
  const passed = result.skipped.filter((item) => item.kind === 'past');
  const blocked = result.skipped.filter((item) => item.kind === 'unavailable');
  const roomName = (id) => rooms.find((room) => room._id === String(id))?.name || 'The room';
  const movieOf = (id) => movies.find((movie) => movie._id === String(id));

  const decide = (item, decision) => setDecisions((current) => {
    const next = { ...current };
    if (decision) next[slotKey(item)] = decision; else delete next[slotKey(item)];
    return next;
  });
  const taken = occupied(result, decisions, (id) => movieOf(id)?.duration || 90);
  const hasFix = clashes.some((item) => !decisions[slotKey(item)] && (item.fixes?.times?.length || item.fixes?.nextFree || item.fixes?.rooms?.length));
  const hasOpen = counts.open > 0;

  const bulk = (
    <div className="plan-bulk">
      <button type="button" className="btn btn-primary btn-small" disabled={!hasFix} onClick={() => setDecisions((current) => autoResolve(result, current, { minutesOf: (id) => movieOf(id)?.duration || 90, gapMinutes }))}>Fix all automatically</button>
      <button type="button" className="btn btn-secondary btn-small" disabled={!hasOpen} onClick={() => setDecisions((current) => skipAllClashes(result, current, new Set(collisions.keys())))}>Skip all clashes</button>
    </div>
  );
  const isOpen = (item) => { const decision = decisions[slotKey(item)]; return !decision || (decision.type !== 'skip' && collisions.has(fixedKey(item, decision))); };
  const card = (item) => (
    <ClashCard
      key={slotKey(item)}
      item={item}
      decision={decisions[slotKey(item)]}
      collision={decisions[slotKey(item)] ? collisions.get(fixedKey(item, decisions[slotKey(item)])) : ''}
      gapMinutes={gapMinutes}
      taken={taken}
      roomName={roomName}
      movie={movieOf(item.movie)}
      onDecide={(decision) => decide(item, decision)}
    />
  );
  const cards = clashes.map(card);
  const leftOut = (passed.length > 0 || blocked.length > 0) && (
    <details className="plan-leftout" open={blocked.length > 0}>
      <summary>{plural(passed.length + blocked.length, 'time')} left out, nothing to decide</summary>
      <ul>
        {passed.length > 0 && <li><b>Already passed ({passed.length}):</b> {passed.slice(0, 6).map((item) => item.label).join(', ')}{passed.length > 6 ? ` and ${passed.length - 6} more` : ''}</li>}
        {blocked.map((item) => <li key={slotKey(item)}><b>{item.label}:</b> {item.reason}</li>)}
      </ul>
    </details>
  );

  // The short version for the setup panel: one line, then only what needs a decision.
  if (compact) {
    return (
      <div className="plan-review plan-compact">
        <p className="plan-clear-line" role="status">
          <b>{plural(counts.total, 'showing')}</b> ready
          {counts.fixed > 0 && <>, <b>{counts.fixed}</b> moved to a free time or room so nothing clashes</>}
          {counts.open > 0 && <>, <b className="plan-open-count">{counts.open}</b> still need{counts.open === 1 ? 's' : ''} a decision</>}.
        </p>
        {counts.open > 0 && (
          <section className="plan-clashes" aria-label="Clashes to settle">
            <div className="plan-clashes-head"><h3>{plural(counts.open, 'clash')} to settle</h3>{bulk}</div>
            {clashes.filter(isOpen).map(card)}
          </section>
        )}
        {clashes.some((item) => !isOpen(item)) && (
          <details className="plan-clear-details">
            <summary>Review the {plural(clashes.filter((item) => !isOpen(item)).length, 'change')}</summary>
            <div className="plan-changes">{clashes.filter((item) => !isOpen(item)).map(card)}</div>
          </details>
        )}
        {leftOut}
        <details className="plan-clear-details">
          <summary>See the schedule day by day</summary>
          <PlanDay result={result} decisions={decisions} collisions={collisions} rooms={rooms} movies={movies} />
        </details>
      </div>
    );
  }

  return (
    <div className="plan-review">
      <div className="plan-summary" aria-live="polite">
        <div className="plan-box ready"><b>{counts.ready}</b><span>ready, no clash</span></div>
        <div className={`plan-box ${counts.open > 0 ? 'open' : 'quiet'}`}><b>{counts.open}</b><span>need a decision</span></div>
        <div className="plan-box quiet"><b>{counts.fixed}</b><span>fixed</span></div>
        <div className="plan-box quiet"><b>{counts.skipped}</b><span>left out</span></div>
      </div>

      <PlanDay result={result} decisions={decisions} collisions={collisions} rooms={rooms} movies={movies} />

      {clashes.length > 0 && (
        <section className="plan-clashes" aria-label="Clashes to settle">
          <div className="plan-clashes-head">
            <h3>{counts.open > 0 ? `${plural(counts.open, 'clash')} to settle` : 'All clashes settled'}</h3>
            {bulk}
          </div>
          {cards}
        </section>
      )}

      {leftOut}
    </div>
  );
}

function ClashCard({ item, decision, collision, gapMinutes, taken, roomName, movie, onDecide }) {
  const minutes = movie?.duration || 90;
  const suggestedTime = pickTime(item, taken, { minutes, gapMinutes });
  const suggestedRooms = pickRooms(item, taken, { minutes, gapMinutes });
  const title = movie?.title || 'This movie';
  const fixed = decision && decision.type !== 'skip' && !collision;
  const skipped = decision?.type === 'skip';
  const window = clashWindow(item, minutes, decision?.type === 'time' ? decision.start : null);
  const span = window.to - window.from;
  const place = (minute) => 3 + ((minute - window.from) / span) * 94;
  const ticks = [];
  const step = span > 300 ? 120 : 60; // fewer labels when the picture is long
  for (let minute = Math.ceil(window.from / step) * step; minute <= window.to; minute += step) ticks.push(minute);
  const startsAt = decision?.type === 'time' ? decision.start : item.startTime;
  const other = decision?.type === 'room' ? roomName(decision.room) : null;
  const overlapping = !decision || collision;
  const fixLabel = decision?.type === 'time' ? `moved to ${displayTime(decision.start)}` : decision?.type === 'room' ? `${other} at ${displayTime(item.startTime)}` : '';

  return (
    <article className={`plan-clash${fixed ? ' is-fixed' : ''}${skipped ? ' is-skipped' : ''}`} aria-label={`${manilaDay(item.startTime)} ${displayTime(item.startTime)} in ${roomName(item.auditorium)}`}>
      <header>
        <b>{shortDate(item.startTime)} · {roomName(item.auditorium)}</b>
        <span className={`plan-tag ${fixed ? 'ok' : skipped ? 'quiet' : 'bad'}`}>{fixed ? `Fixed: ${fixLabel}` : skipped ? 'Skipped' : collision ? 'Collides' : 'Clash'}</span>
      </header>

      {!skipped && (
        <div className="plan-bar" role="img" aria-label={`${item.clash.title} from ${displayTime(item.clash.startTime)} to ${displayTime(item.clash.endTime)}; ${title} at ${displayTime(startsAt)}`}>
          {ticks.map((minute) => <span className="plan-tick" key={minute} style={{ left: `${place(minute)}%` }}>{clockLabel(minute)}</span>)}
          {decision?.type !== 'room' && (
            <>
              <span className="plan-existing" style={{ left: `${place(window.existing[0])}%`, width: `${place(window.existing[1]) - place(window.existing[0])}%` }}>{item.clash.title}</span>
              <span className="plan-buffer" style={{ left: `${place(window.existing[1])}%`, width: `${(gapMinutes / span) * 94}%` }} title="Room reset" />
            </>
          )}
          <span className={`plan-proposed${overlapping ? ' bad' : ' good'}`} style={{ left: `${place(window.proposed[0])}%`, width: `${((window.proposed[1] - window.proposed[0]) / span) * 94}%` }}>
            {overlapping ? '✕ ' : '✓ '}{displayTime(startsAt)}
          </span>
        </div>
      )}

      {!decision && <p className="plan-why">{describeClash(item, { roomName: roomName(item.auditorium), movieTitle: title, movieMinutes: minutes, gapMinutes })}</p>}
      {collision && <p className="plan-why bad">{collision}</p>}
      {fixed && <p className="plan-why">{decision.type === 'time' ? `${title} will start at ${displayTime(decision.start)} in ${roomName(item.auditorium)}.` : `${title} keeps ${displayTime(item.startTime)} and moves to ${other}.`}</p>}

      {(!decision || collision) ? (
        <div className="plan-options">
          {suggestedTime && (
            <button type="button" className="plan-option recommended" onClick={() => onDecide({ type: 'time', start: suggestedTime })}>
              <b>Start at {displayTime(suggestedTime)}</b><small>Next free time, same room</small>
            </button>
          )}
          {suggestedRooms.slice(0, 2).map((room) => (
            <button type="button" key={room._id} className="plan-option" onClick={() => onDecide({ type: 'room', room: String(room._id) })}>
              <b>Keep {displayTime(item.startTime)}, use {room.name}</b><small>Free at that time</small>
            </button>
          ))}
          {!suggestedTime && suggestedRooms.length === 0 && <p className="plan-none">No free time that day and no other room is free at that time. Skip it, or change the times above.</p>}
          <button type="button" className="plan-option" onClick={() => onDecide({ type: 'skip' })}><b>Skip this one</b><small>Create the others</small></button>
        </div>
      ) : (
        <div className="plan-options"><button type="button" className="btn btn-secondary btn-small" onClick={() => onDecide(null)}>Undo</button></div>
      )}
    </article>
  );
}

// One day of the plan on the room timeline: showings already saved (grey), ready ones in the
// movie's colour, clashes in red, fixed ones in green.
function PlanDay({ result, decisions, collisions, rooms, movies }) {
  const days = useMemo(() => {
    const found = new Map();
    const note = (item, field) => {
      const day = manilaDay(item.startTime);
      const entry = found.get(day) || { ready: 0, clash: 0 };
      entry[field] += 1;
      found.set(day, entry);
    };
    result.created.forEach((item) => note(item, 'ready'));
    result.skipped.filter((item) => item.kind === 'clash').forEach((item) => note(item, 'clash'));
    return [...found.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  }, [result]);

  const firstClash = days.find(([, entry]) => entry.clash > 0)?.[0];
  const [chosen, setChosen] = useState('');
  const day = days.some(([value]) => value === chosen) ? chosen : (firstClash || days[0]?.[0] || '');
  const [existing, setExisting] = useState([]);

  useEffect(() => {
    if (!day) { setExisting([]); return undefined; }
    const controller = new AbortController();
    apiAll(`/admin/showtimes?date=${day}`, { signal: controller.signal })
      .then((rows) => setExisting(rows.filter((row) => row.status === 'scheduled')))
      .catch(() => { if (!controller.signal.aborted) setExisting([]); });
    return () => controller.abort();
  }, [day]);

  if (!day) return null;
  const minutesOf = (movieId) => movies.find((movie) => movie._id === String(movieId))?.duration || 90;
  const titleOf = (movieId) => movies.find((movie) => movie._id === String(movieId))?.title || 'Showing';
  const bars = [];
  for (const row of existing) bars.push({ room: row.auditorium?._id, start: minutesOfDay(row.startTime), end: minutesOfDay(row.startTime) + (new Date(row.endTime) - new Date(row.startTime)) / 60000, kind: 'existing', title: row.movie?.title || 'Showing' });
  for (const item of result.created.filter((entry) => manilaDay(entry.startTime) === day)) {
    bars.push({ room: item.auditorium, start: minutesOfDay(item.startTime), end: minutesOfDay(item.startTime) + minutesOf(item.movie), kind: 'ready', title: titleOf(item.movie), movie: item.movie });
  }
  for (const item of result.skipped.filter((entry) => entry.kind === 'clash' && manilaDay(entry.startTime) === day)) {
    const decision = decisions[slotKey(item)];
    if (decision?.type === 'skip') continue;
    const slot = decision ? fixedSlot(item, decision) : { auditorium: item.auditorium, startTime: item.startTime };
    const clashing = !decision || collisions.has(fixedKey(item, decision));
    bars.push({ room: slot.auditorium, start: minutesOfDay(slot.startTime), end: minutesOfDay(slot.startTime) + minutesOf(item.movie), kind: clashing ? 'clash' : 'fixed', title: titleOf(item.movie) });
  }
  const from = Math.max(0, Math.min(600, Math.floor(Math.min(...bars.map((bar) => bar.start), 600) / 60) * 60));
  const to = Math.min(1440, Math.max(1320, Math.ceil(Math.max(...bars.map((bar) => bar.end), 1320) / 60) * 60));
  const place = (minute) => ((minute - from) / (to - from)) * 100;
  const usedRooms = rooms.filter((room) => bars.some((bar) => String(bar.room) === room._id));
  const marks = [];
  for (let hour = Math.ceil(from / 120) * 2; hour * 60 <= to; hour += 2) marks.push(hour * 60);

  return (
    <section className="plan-day" aria-label="The plan on the room timeline">
      <div className="plan-day-head">
        <h3>Room timeline</h3>
        <label>
          <span className="visually-hidden">Day to preview</span>
          <select value={day} onChange={(event) => setChosen(event.target.value)}>
            {days.map(([value, entry]) => <option key={value} value={value}>{dayLabel(value)} · {entry.ready} ready{entry.clash ? `, ${plural(entry.clash, 'clash')}` : ''}</option>)}
          </select>
        </label>
      </div>
      <div className="plan-timeline-scroll">
        <div className="plan-timeline">
          <div className="plan-row plan-hours" aria-hidden="true"><span /><div className="plan-track plain">{marks.map((minute) => <span key={minute} style={{ left: `${place(minute)}%` }}>{clockLabel(minute)}</span>)}</div></div>
          {usedRooms.map((room) => (
            <div className="plan-row" key={room._id}>
              <strong>{room.name}</strong>
              <div className="plan-track">
                {bars.filter((bar) => String(bar.room) === room._id).map((bar, index) => (
                  <span key={`${bar.kind}${index}`} className={`plan-bar-block ${bar.kind}`} style={{ left: `${place(bar.start)}%`, width: `${Math.max(3, place(bar.end) - place(bar.start))}%`, ...(bar.kind === 'ready' ? { '--movie-color': movieColor(bar.movie) } : {}) }} title={`${bar.title} ${displayTime(`2000-01-01T${String(Math.floor(bar.start / 60)).padStart(2, '0')}:${String(bar.start % 60).padStart(2, '0')}:00+08:00`)}`}>
                    {bar.kind === 'clash' ? '✕ ' : ''}{bar.title}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="plan-legend"><span className="existing">Already scheduled</span><span className="ready">Ready</span><span className="fixed">Fixed</span><span className="clash">Clash</span></div>
    </section>
  );
}
