import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import { describeError, pesos } from '../../utils/adminTools';

import { daysBetween, manilaDay, shiftDay, today } from '../../utils/manila';
import { RANGES, rangeFor } from '../../utils/schedule';
import { COMMON_TIMES, TIME_OPTIONS, clock12, defaultStart, endsText, quickDays } from '../../utils/timeSlots';
import Drawer from './Drawer';
import Feedback from './Feedback';

// Just the reasons, without the leading Validation failed.
const reasons = (err) => (err.errors ? Object.values(err.errors).join(' ') : describeError(err));
const MAX_DAYS = 31;
// Monday first, as people read a week. The number is what the server expects (Sunday = 0).
const WEEKDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const dayLabel = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', day: 'numeric', month: 'short' });

// Schedule many showings, or copy one day to other days. The admin taps a movie, a room, some days
// and some times; the screen works out the rest and checks it against the schedule as they go, so
// "Schedule 27 showings" is a button they press once they have seen what will happen.
export default function AdminBulk({ movies, rooms, onDone, scheduleFor, open, mode, onModeChange, onClose, defaultDay, preset, lockedMovie = false, roomError, onRetryRooms, onBack, onManageRooms }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Drafts can be scheduled too (customers see the showings once the movie is published); archived ones cannot.
  const availableMovies = movies.filter((movie) => movie.status !== 'archived');
  const active = rooms.filter((room) => room.isActive);

  const [movie, setMovie] = useState('');
  const [room, setRoom] = useState('');
  const [span, setSpan] = useState('one'); // 'one': just one day, 'many': a range of days
  const [oneDay, setOneDay] = useState(today());
  const [range, setRange] = useState('next7');
  const [custom, setCustom] = useState({ startDate: shiftDay(today(), 1), endDate: shiftDay(today(), 7) });
  const [weekdays, setWeekdays] = useState(ALL_DAYS);
  const [times, setTimes] = useState(['10:00', '13:30', '17:00', '20:30']);
  const [price, setPrice] = useState('400');
  const [hidden, setHidden] = useState(false);
  const [publishMovie, setPublishMovie] = useState(true);
  const [skipConflicts, setSkipConflicts] = useState(false);
  const [completion, setCompletion] = useState(null);
  const [retry, setRetry] = useState(0);
  const [copyFrom, setCopyFrom] = useState(today());
  const [copyRange, setCopyRange] = useState('next7');
  const [copyCustom, setCopyCustom] = useState({ startDate: shiftDay(today(), 1), endDate: shiftDay(today(), 7) });
  const [preview, setPreview] = useState(null); // { result, request } | { problem, request }
  const [checking, setChecking] = useState(false);
  const ticket = useRef(0);

  useEffect(() => { if (open) { setCompletion(null); setError(''); } }, [open]);

  // Arriving from "Schedule showings" after adding a movie: that movie is already chosen.
  useEffect(() => { if (scheduleFor) setMovie(scheduleFor.movieId); }, [scheduleFor]);
  // Opened from "+ Add showing" (one day, maybe a clicked time and room) or from "Many days".
  useEffect(() => {
    if (!open || !preset) return;
    setCompletion(null);
    setError('');
    setSkipConflicts(false);
    setHidden(false);
    setPublishMovie(true);
    setSpan(preset.span || 'one');
    if (preset.span === 'one') {
      const selectedMovie = movies.find((item) => item._id === scheduleFor?.movieId);
      const releaseDay = String(selectedMovie?.releaseDate || '').slice(0, 10);
      const day = preset.day || (releaseDay > today() ? releaseDay : today());
      const [startDay, startClock] = defaultStart(day).split('T');
      setOneDay(preset.time ? day : startDay);
      setTimes([preset.time || startClock]);
    }
    if (preset.room) setRoom(preset.room);
    setPreview(null);
  }, [open, preset]);
  // Opening from a day on the schedule: copy that day, and start the new showings after it.
  useEffect(() => {
    if (!open || !defaultDay) return;
    setCopyFrom(defaultDay);
  }, [open, defaultDay]);

  const chosenMovie = availableMovies.find((item) => item._id === (movie || availableMovies[0]?._id));
  const chosenRoom = active.find((item) => item._id === (room || active[0]?._id));
  const manyDates = span === 'one' ? { startDate: oneDay, endDate: oneDay } : (range === 'custom' ? custom : rangeFor(range, today()));
  const copyDates = copyRange === 'custom' ? copyCustom : rangeFor(copyRange, today());

  // What would be sent, or why nothing can be sent yet.
  const request = useMemo(() => {
    if (mode === 'many') {
      if (!chosenMovie || !chosenRoom) return { problem: 'Add a movie (it can be a draft) and an active room first.' };
      if (times.length === 0) return { problem: 'Pick at least one start time.' };
      if (times.length > 20) return { problem: 'Choose up to 20 start times per day.' };
      if (span === 'many' && weekdays.length === 0) return { problem: 'Pick at least one day of the week.' };
      const cents = Math.round(Number(price) * 100);
      if (!Number.isFinite(cents) || cents < 0 || price === '') return { problem: 'Enter the price per seat.' };
      if (!manyDates.startDate || !manyDates.endDate || manyDates.endDate < manyDates.startDate) return { problem: 'Choose the first and last day.' };
      const days = daysBetween(manyDates.startDate, manyDates.endDate);
      const slotDays = span === 'one' ? days : days.filter((day) => weekdays.includes(new Date(`${day}T12:00:00+08:00`).getUTCDay()));
      if (slotDays.length * times.length > 200) return { problem: 'Choose at most 200 showings at a time. Reduce the days or start times.' };
      if (days.length > MAX_DAYS) return { problem: `Choose at most ${MAX_DAYS} days at a time.` };
      return {
        path: '/showtimes/bulk',
        body: {
          movie: chosenMovie._id, auditorium: chosenRoom._id, startDate: manyDates.startDate, endDate: manyDates.endDate, times,
          weekdays: span === 'one' || weekdays.length === 7 ? undefined : weekdays, ticketPrice: cents, published: !hidden,
          publishMovie: !hidden && (chosenMovie.status === 'published' || publishMovie),
        },
      };
    }
    // The day being copied is never a target.
    const toDates = copyDates.startDate && copyDates.endDate ? daysBetween(copyDates.startDate, copyDates.endDate).filter((day) => day !== copyFrom) : [];
    if (!copyFrom) return { problem: 'Choose the day to copy.' };
    if (toDates.length === 0) return { problem: 'Choose at least one day to copy to (other than the day being copied).' };
    if (toDates.length > MAX_DAYS) return { problem: `Choose at most ${MAX_DAYS} days at a time.` };
    return { path: '/showtimes/copy', body: { fromDate: copyFrom, toDates, ...(hidden ? { published: false } : {}) } };
  }, [mode, span, chosenMovie, chosenRoom, times, weekdays, price, manyDates.startDate, manyDates.endDate, hidden, publishMovie, copyFrom, copyDates.startDate, copyDates.endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check the request against the schedule a moment after the admin stops changing things.
  useEffect(() => {
    const mine = ++ticket.current;
    setSkipConflicts(false);
    setPreview(null);
    if (!open || completion) { setChecking(false); return undefined; }
    if (request.problem) { setPreview({ problem: request.problem, request }); setChecking(false); return undefined; }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api(request.path, { method: 'POST', body: { ...request.body, skipConflicts: true, dryRun: true } });
        if (ticket.current === mine) setPreview({ result, request });
      } catch (err) {
        if (ticket.current === mine) setPreview({ problem: reasons(err), request });
      } finally {
        if (ticket.current === mine) setChecking(false);
      }
    }, 400);
    return () => { clearTimeout(timer); if (ticket.current === mine) ticket.current += 1; };
  }, [open, request, retry, completion]);

  if (!open) return null;

  const result = preview?.request === request ? preview.result : null;
  const skipped = result?.skippedCount || 0;
  const count = result?.createdCount || 0;

  const schedule = async () => {
    if (busy || checking || !result || !count || (skipped > 0 && !skipConflicts)) return;
    setError('');
    setBusy(true);
    try {
      const done = await api(request.path, { method: 'POST', body: { ...request.body, skipConflicts, dryRun: false } });
      if (!done.createdCount) { setError('No showings were saved. The schedule may have changed. Review the updated check below.'); setRetry((value) => value + 1); return; }
      const live = mode === 'many' && (done.moviePublished || (chosenMovie?.status === 'published' && !hidden));
      const message = `${done.createdCount} showing${done.createdCount === 1 ? '' : 's'} saved${done.skippedCount ? ` · ${done.skippedCount} skipped` : ''}. ${mode === 'copy' ? 'Copied showings keep their original visibility unless you chose to hide them.' : live ? 'The movie is visible and tickets are on sale.' : chosenMovie?.status === 'draft' ? 'The movie is still a draft, hidden from customers.' : hidden ? 'These showings are hidden from customers.' : 'Copied showings keep their original visibility.'}`;
      setCompletion({ message, live, movieId: mode === 'many' ? chosenMovie?._id : null, day: done.created[0]?.startTime ? manilaDay(done.created[0].startTime) : null });
    } catch (err) {
      setError(reasons(err));
      setRetry((value) => value + 1);
    } finally {
      setBusy(false);
    }
  };

  const toggleWeekday = (value) => setWeekdays((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  const toggleTime = (clock) => setTimes((current) => (current.includes(clock) ? current.filter((item) => item !== clock) : [...current, clock].sort()));
  const weekdaySummary = weekdays.length === 7 ? 'every day' : weekdays.length === 0 ? 'no days' : WEEKDAYS.filter(([, value]) => weekdays.includes(value)).map(([name]) => name).join(', ');
  const extraTimes = times.filter((clock) => !COMMON_TIMES.includes(clock));
  const minutes = chosenMovie?.duration;

  const rangePicker = (current, setCurrent, dates, customDates, setCustomDates) => (
    <>
      <div className="when-chips" role="group" aria-label="Which days">
        {RANGES.map(([key, label]) => (
          <button key={key} type="button" className={`when-chip${current === key ? ' active' : ''}`} aria-pressed={current === key} onClick={() => setCurrent(key)}>{label}</button>
        ))}
        <button type="button" className={`when-chip${current === 'custom' ? ' active' : ''}`} aria-pressed={current === 'custom'} onClick={() => { setCustomDates(dates); setCurrent('custom'); }}>Pick dates…</button>
      </div>
      {current === 'custom' && (
        <div className="bulk-dates">
          <label>First day<input type="date" min={today()} value={customDates.startDate} onChange={(event) => setCustomDates({ ...customDates, startDate: event.target.value })} /></label>
          <label>Last day<input type="date" min={customDates.startDate} value={customDates.endDate} onChange={(event) => setCustomDates({ ...customDates, endDate: event.target.value })} /></label>
        </div>
      )}
      {dates.startDate && dates.endDate && dates.endDate >= dates.startDate && <p className="bulk-hint">{dayLabel(dates.startDate)} to {dayLabel(dates.endDate)} · {daysBetween(dates.startDate, dates.endDate).length} days</p>}
    </>
  );

  if (completion) return <Drawer title={completion.live ? 'Movie and tickets are live' : 'Schedule saved'} onClose={() => onDone(completion.message, completion.movieId, completion.day)} wide>
    <div className="movie-saved" role="status"><span className="movie-saved-mark" aria-hidden="true">✓</span><h3>{chosenMovie?.title || 'Showings saved'}</h3><p>{completion.message}</p>
      <div className="movie-saved-actions">{completion.live && completion.movieId && <a className="movie-button movie-button-outline" href={`/movie/${completion.movieId}`} target="_blank" rel="noreferrer">View customer page ↗</a>}<button type="button" className="btn btn-primary drawer-first" autoFocus onClick={() => onDone(completion.message, completion.movieId, completion.day)}>Done</button></div>
    </div></Drawer>;

  return (
    <Drawer title={mode === 'copy' ? 'Copy a day' : span === 'one' ? 'Add showings' : 'Schedule showings'} onClose={() => { if (!busy) onClose(); }} wide>
      {onBack && <button type="button" className="bulk-link" disabled={busy} onClick={onBack}>← Back to movie details</button>}
      {lockedMovie && <div className="movie-flow-intro"><ol className="movie-flow-steps" aria-label="Create movie progress"><li><b>✓</b> Details saved</li><li aria-current="step"><b>2</b> Showings & publish</li></ol><p>Your movie is saved. Choose a room and time, then finish below. All times are in Manila.</p></div>}
      {!lockedMovie && <div className="when-chips bulk-mode" role="group" aria-label="What to do">
        <button type="button" className={`when-chip${mode === 'many' ? ' active' : ''}`} aria-pressed={mode === 'many'} onClick={() => onModeChange('many')}>New showings</button>
        <button type="button" className={`when-chip${mode === 'copy' ? ' active' : ''}`} aria-pressed={mode === 'copy'} onClick={() => onModeChange('copy')}>Copy a day</button>
      </div>}
      <Feedback error={error || roomError} notice="" />
      {roomError && <button type="button" className="btn btn-secondary" onClick={onRetryRooms}>Retry loading rooms</button>}

      <fieldset className="bulk-fields" disabled={busy}>
      {mode === 'many' ? (
        <div className="bulk-steps">
          <section className="bulk-step">
            <h3><span>1</span> Movie and room</h3>
            <label>Movie
              <select disabled={lockedMovie} value={chosenMovie?._id || ''} onChange={(event) => setMovie(event.target.value)}>
                {availableMovies.map((item) => <option key={item._id} value={item._id}>{item.title} ({item.duration} min){item.status === 'draft' ? ' · draft' : ''}</option>)}
              </select>
            </label>
            <label>Room
              <select value={chosenRoom?._id || ''} onChange={(event) => setRoom(event.target.value)}>
                {active.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.rows * item.seatsPerRow} seats</option>)}
              </select>
            </label>
            {!active.length && <p className="bulk-problem">No active rooms. Add or activate a room to continue; your movie is saved.{onManageRooms && <button type="button" className="bulk-link" onClick={onManageRooms}>Set up a room →</button>}</p>}
          </section>

          <section className="bulk-step">
            <h3><span>2</span> {span === 'one' ? 'Which day' : 'Which days'}</h3>
            <div className="when-chips" role="group" aria-label="One day or several">
              <button type="button" className={`when-chip small${span === 'one' ? ' active' : ''}`} aria-pressed={span === 'one'} onClick={() => setSpan('one')}>Just one day</button>
              <button type="button" className={`when-chip small${span === 'many' ? ' active' : ''}`} aria-pressed={span === 'many'} onClick={() => setSpan('many')}>Several days</button>
            </div>
            {span === 'one' ? (
              <>
                <div className="when-chips" role="group" aria-label="Day">
                  {quickDays(today()).map((item) => (
                    <button key={item.day} type="button" className={`when-chip${oneDay === item.day ? ' active' : ''}`} aria-pressed={oneDay === item.day} onClick={() => setOneDay(item.day)}>{item.label}</button>
                  ))}
                </div>
                <label className="when-other">Another day
                  <input type="date" min={today()} value={oneDay} onChange={(event) => event.target.value && setOneDay(event.target.value)} />
                </label>
                {oneDay && <p className="bulk-hint">{dayLabel(oneDay)}</p>}
              </>
            ) : (
              <>
                {rangePicker(range, setRange, manyDates, custom, setCustom)}
                <div className="when-chips" role="group" aria-label="Days of the week">
                  {WEEKDAYS.map(([name, value]) => (
                    <button key={name} type="button" className={`when-chip small${weekdays.includes(value) ? ' active' : ''}`} aria-pressed={weekdays.includes(value)} onClick={() => toggleWeekday(value)}>{name}</button>
                  ))}
                  <button type="button" className="bulk-link" onClick={() => setWeekdays(ALL_DAYS)}>Every day</button>
                  <button type="button" className="bulk-link" onClick={() => setWeekdays([1, 2, 3, 4, 5])}>Weekdays</button>
                  <button type="button" className="bulk-link" onClick={() => setWeekdays([6, 0])}>Weekends</button>
                </div>
              </>
            )}
          </section>

          <section className="bulk-step">
            <h3><span>3</span> Start times <small className="bulk-pick-many">tap as many as you like</small></h3>
            <div className="when-chips" role="group" aria-label="Start times">
              {[...COMMON_TIMES, ...extraTimes].map((clock) => (
                <button key={clock} type="button" className={`when-chip${times.includes(clock) ? ' active' : ''}`} aria-pressed={times.includes(clock)} onClick={() => toggleTime(clock)}>{clock12(clock)}</button>
              ))}
            </div>
            <div className="when-chips"><button type="button" className="bulk-link" onClick={() => setTimes((current) => [...new Set([...current, ...COMMON_TIMES])].sort())}>Select all usual times</button><button type="button" className="bulk-link" onClick={() => setTimes([])}>Clear</button></div>
            <label className="when-other">Add another time
              <select value="" onChange={(event) => event.target.value && toggleTime(event.target.value)}>
                <option value="">Choose…</option>
                {TIME_OPTIONS.filter((option) => !times.includes(option.value)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {times.length > 0 && minutes && (
              <ul className="bulk-times">
                {times.map((clock) => <li key={clock}><b>{clock12(clock)}</b> <span>{endsText(clock, minutes)}</span></li>)}
              </ul>
            )}
          </section>

          <section className="bulk-step">
            <h3><span>4</span> Price & visibility</h3>
            <label>Price per seat (₱)<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
            {chosenMovie?.status === 'draft' && <label className="admin-check"><input type="checkbox" checked={publishMovie && !hidden} onChange={(event) => { setPublishMovie(event.target.checked); if (event.target.checked) setHidden(false); }} /> Publish the movie and put these tickets on sale together</label>}
            <details className="bulk-advanced"><summary>Advanced: keep these showings hidden</summary><label className="admin-check"><input type="checkbox" checked={hidden} onChange={(event) => { setHidden(event.target.checked); if (event.target.checked) setPublishMovie(false); }} /> Hide these showings from customers</label></details>
            <p className="bulk-hint">{chosenMovie?.status === 'draft' && (!publishMovie || hidden) ? 'Save schedule only: the movie stays a draft, hidden from customers.' : hidden ? 'The movie page stays visible. These showings cannot be booked until you make them visible.' : 'Customers can choose these showings and book seats as soon as you finish.'}</p>
          </section>
        </div>
      ) : (
        <div className="bulk-steps">
          <section className="bulk-step">
            <h3><span>1</span> Which day to copy</h3>
            <label>Copy the showings of<input type="date" value={copyFrom} onChange={(event) => setCopyFrom(event.target.value)} /></label>
          </section>
          <section className="bulk-step">
            <h3><span>2</span> Copy it to</h3>
            {rangePicker(copyRange, setCopyRange, copyDates, copyCustom, setCopyCustom)}
            <label className="admin-check"><input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} /> Keep the copies hidden from customers until I publish them</label>
          </section>
        </div>
      )}

      </fieldset>
      <div className="bulk-footer">
        <div className="bulk-result" aria-live="polite">
          {preview?.problem && <p className="bulk-problem">{preview.problem}</p>}
          {(checking || (!result && !preview?.problem)) && <p className="bulk-hint">Checking the schedule…</p>}
          {!checking && result && (
            <>
              <p className="bulk-count">
                <b>{count}</b> showing{count === 1 ? '' : 's'} available to schedule
                {mode === 'many' && chosenMovie && chosenRoom && count > 0 ? <> for <b>{chosenMovie.title}</b> in {chosenRoom.name}, {span === 'one' ? `on ${dayLabel(oneDay)}` : weekdaySummary}, at {pesos(Math.round(Number(price) * 100))} a seat</> : null}.
              </p>
              {count === 0 && skipped > 0 && <p className="bulk-problem">None of these times can be scheduled. Review the reasons below, then change the times or days{mode === 'many' ? ', or another room' : ''}.</p>}
              {skipped > 0 && (
                <details className="bulk-skipped" open>
                  <summary>{skipped} time{skipped === 1 ? '' : 's'} need attention</summary>
                  <ul>
                    {result.skipped.map((item) => <li key={item.startTime}><b>{item.label}</b>: {item.reason}</li>)}
                  </ul>
                </details>
              )}
              {skipped > 0 && count > 0 && <label className="admin-check bulk-skip-choice"><input type="checkbox" checked={skipConflicts} disabled={busy} onChange={(event) => setSkipConflicts(event.target.checked)} /> Skip the {skipped} unavailable time{skipped === 1 ? '' : 's'} and save only the {count} available showing{count === 1 ? '' : 's'}</label>}
              {skipped > 0 && !skipConflicts && <p className="bulk-hint">Fix the unavailable times{count > 0 ? ', or choose to skip them above' : ''}. Nothing has been saved.</p>}
            </>
          )}
        </div>
        <button type="button" className="btn btn-primary" disabled={busy || checking || !result || count === 0 || (skipped > 0 && !skipConflicts)} aria-busy={busy} onClick={schedule}>
          <ActionPending pending={busy}>{busy ? 'Scheduling…' : count > 0 ? `${chosenMovie?.status === 'draft' && request.body?.publishMovie ? 'Publish movie & ' : ''}${mode === 'copy' ? 'copy' : 'save'} ${count} showing${count === 1 ? '' : 's'}` : 'Nothing to schedule yet'}</ActionPending>
        </button>
      </div>
    </Drawer>
  );
}
