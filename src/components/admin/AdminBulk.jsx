import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import DatePicker from '../DatePicker';
import { dateProblem } from '../../utils/calendar';
import { describeError, pesos } from '../../utils/adminTools';

// Just the reasons, without the leading "Validation failed".
const reasons = (err) => (err.errors ? Object.values(err.errors).join(' ') : describeError(err));
import { daysBetween, shiftDay, today } from '../../utils/manila';
import { RANGES, rangeFor } from '../../utils/schedule';
import { COMMON_TIMES, TIME_OPTIONS, clock12, defaultStart, endsText, quickDays } from '../../utils/timeSlots';
import Drawer from './Drawer';
import Feedback from './Feedback';
import PlanReview from './PlanReview';
import { fixedKey, planCounts, slotKey, slotsToSave } from '../../utils/planReview';

const MAX_DAYS = 31;
// Monday first, as people read a week. The number is what the server expects (Sunday = 0).
const WEEKDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const dayLabel = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', day: 'numeric', month: 'short' });

// Schedule many showings, or copy one day to other days. The admin taps a movie, a room, some days
// and some times; the screen works out the rest and checks it against the schedule as they go, so
// "Schedule 27 showings" is a button they press once they have seen what will happen.
export default function AdminBulk({ movies, rooms, onDone, open, mode, onModeChange, onClose, defaultDay, preset, gapMinutes = 15, lockedMovie = false, roomError, onRetryRooms, onBack, onManageRooms }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Drafts can be scheduled too (customers see the showings once the movie is published); archived ones cannot.
  const published = movies.filter((movie) => movie.status !== 'archived');
  const active = rooms.filter((room) => room.isActive);

  const [movie, setMovie] = useState(preset?.movieId || '');
  const [room, setRoom] = useState(preset?.room || '');
  const [span, setSpan] = useState(preset?.span || 'one'); // 'one': just one day, 'many': a range of days
  const [oneDay, setOneDay] = useState(() => preset?.time ? preset.day || today() : defaultStart(preset?.day || today()).split('T')[0]);
  const [range, setRange] = useState('next7');
  const [custom, setCustom] = useState({ startDate: shiftDay(today(), 1), endDate: shiftDay(today(), 7) });
  const [weekdays, setWeekdays] = useState(ALL_DAYS);
  const [times, setTimes] = useState(() => preset?.span === 'one'
    ? [preset.time || defaultStart(preset.day || today()).split('T')[1]]
    : ['10:00', '13:30', '17:00', '20:30']);
  const [price, setPrice] = useState('400');
  const [hidden, setHidden] = useState(false);
  const [publishMovie, setPublishMovie] = useState(true);
  const [skipUnavailable, setSkipUnavailable] = useState(false);
  const [copyFrom, setCopyFrom] = useState(() => defaultDay || today());
  const [copyRange, setCopyRange] = useState('next7');
  const [copyCustom, setCopyCustom] = useState({ startDate: shiftDay(today(), 1), endDate: shiftDay(today(), 7) });
  const [preview, setPreview] = useState(null); // { ok, result } | { problem }
  const [checking, setChecking] = useState(false);
  const [decisions, setDecisions] = useState({}); // what the admin chose for each clash: { time | room | skip }
  const [collisions, setCollisions] = useState(() => new Map()); // fixes that no longer fit, with the reason
  const [refresh, setRefresh] = useState(0);
  const ticket = useRef(0);
  const saving = useRef(false);

  const chosenMovie = published.find((item) => item._id === (movie || published[0]?._id));
  const chosenRoom = active.find((item) => item._id === (room || active[0]?._id));
  const manyDates = span === 'one' ? { startDate: oneDay, endDate: oneDay } : (range === 'custom' ? custom : rangeFor(range, today()));
  const copyDates = copyRange === 'custom' ? copyCustom : rangeFor(copyRange, today());
  const timeProblem = mode === 'many' && manyDates.startDate <= today() && manyDates.endDate >= today()
    && (span === 'one' || weekdays.includes(new Date(`${today()}T12:00:00+08:00`).getUTCDay()))
    && times.some(time => Date.parse(`${today()}T${time}:00+08:00`) <= Date.now())
    ? 'A selected showtime has already passed in Manila. Choose later times or another day.' : '';

  // What would be sent, or why nothing can be sent yet.
  const request = useMemo(() => {
    if (mode === 'many') {
      const invalidDate = dateProblem(manyDates.startDate, { min: today(), required: true }) || dateProblem(manyDates.endDate, { min: manyDates.startDate, required: true });
      if (invalidDate || timeProblem) return { problem: invalidDate || timeProblem };
      if (!chosenMovie || !chosenRoom) return { problem: 'Add a movie (it can be a draft) and an active room first.' };
      if (times.length === 0) return { problem: 'Pick at least one start time.' };
      if (times.length > 20) return { problem: 'Choose up to 20 start times per day.' };
      if (span === 'many' && weekdays.length === 0) return { problem: 'Pick at least one day of the week.' };
      const cents = Math.round(Number(price) * 100);
      if (!Number.isFinite(cents) || cents < 0 || price === '') return { problem: 'Enter the price per seat.' };
      if (!manyDates.startDate || !manyDates.endDate || manyDates.endDate < manyDates.startDate) return { problem: 'Choose the first and last day.' };
      const days = daysBetween(manyDates.startDate, manyDates.endDate);
      const slotDays = span === 'one' ? days : days.filter((day) => weekdays.includes(new Date(`${day}T12:00:00+08:00`).getUTCDay()));
      if (slotDays.length * times.length > 200) return { problem: 'Choose at most 200 showings at a time.' };
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
    const invalidDate = dateProblem(copyFrom, { required: true }) || dateProblem(copyDates.startDate, { min: today(), required: true }) || dateProblem(copyDates.endDate, { min: copyDates.startDate, required: true });
    if (invalidDate) return { problem: invalidDate };
    if (toDates.length === 0) return { problem: 'Choose at least one day to copy to (other than the day being copied).' };
    if (toDates.length > MAX_DAYS) return { problem: `Choose at most ${MAX_DAYS} days at a time.` };
    return { path: '/showtimes/copy', body: { fromDate: copyFrom, toDates, ...(hidden ? { published: false } : {}) } };
  }, [mode, span, chosenMovie, chosenRoom, times, weekdays, price, manyDates.startDate, manyDates.endDate, hidden, publishMovie, copyFrom, copyDates.startDate, copyDates.endDate, timeProblem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check the request against the schedule a moment after the admin stops changing things.
  useEffect(() => {
    const mine = ++ticket.current;
    setPreview(null);
    setSkipUnavailable(false);
    if (!open) { setChecking(false); return undefined; }
    if (request.problem) { setPreview({ problem: request.problem, request }); setChecking(false); return undefined; }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api(request.path, { method: 'POST', body: { ...request.body, skipConflicts: true, dryRun: true } });
        if (ticket.current === mine) { setPreview({ result, request }); setDecisions({}); setCollisions(new Map()); }
      } catch (err) {
        if (ticket.current === mine) setPreview({ problem: reasons(err), request });
      } finally {
        if (ticket.current === mine) setChecking(false);
      }
    }, 400);
    return () => { clearTimeout(timer); ticket.current += 1; };
  }, [open, request, refresh]);

  // Two fixes can land on the same time. Check the plan as it now stands and flag any fix that no longer fits.
  const planResult = preview?.request === request ? preview.result : null;
  useEffect(() => {
    if (!open || !planResult) return undefined;
    const fixes = (planResult.skipped || []).filter((item) => item.kind === 'clash' && decisions[slotKey(item)] && decisions[slotKey(item)].type !== 'skip');
    if (fixes.length === 0) { setCollisions((current) => (current.size ? new Map() : current)); return undefined; }
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const check = await api('/showtimes/slots', { method: 'POST', body: { slots: slotsToSave(planResult, decisions), publishMovie: mode === 'many' && request.body.publishMovie, skipConflicts: true, dryRun: true } });
        if (!current) return;
        const reasonsByKey = new Map(check.skipped.map((item) => [slotKey(item), item.reason]));
        const next = new Map();
        for (const item of fixes) {
          const key = fixedKey(item, decisions[slotKey(item)]);
          if (reasonsByKey.has(key)) next.set(key, `This fix no longer fits: ${reasonsByKey.get(key)}. Choose another fix.`);
        }
        setCollisions(next);
      } catch { /* the final save checks again */ }
    }, 300);
    return () => { current = false; clearTimeout(timer); };
  }, [open, planResult, decisions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const result = preview?.request === request ? preview.result : null;
  const unavailable = result?.skipped.filter((item) => item.kind !== 'clash').length || 0;

  const counts = result ? planCounts(result, decisions, collisions) : { ready: 0, open: 0, fixed: 0, skipped: 0, total: 0 };
  const plural = (n, word) => `${n} ${n === 1 ? word : word === 'clash' ? 'clashes' : `${word}s`}`;

  const schedule = async () => {
    if (saving.current || checking || !result || counts.open > 0 || counts.total === 0 || (unavailable > 0 && !skipUnavailable)) return;
    const dates = mode === 'many' ? manyDates : copyDates;
    const invalidDate = (mode === 'copy' && dateProblem(copyFrom, { required: true })) || dateProblem(dates.startDate, { min: today(), required: true }) || dateProblem(dates.endDate, { min: dates.startDate, required: true });
    if (invalidDate) { setError(invalidDate); return; }
    saving.current = true;
    setError('');
    setBusy(true);
    try {
      // Save exactly what was reviewed: the ready showings plus the fixes, all or nothing.
      const done = await api('/showtimes/slots', { method: 'POST', body: { slots: slotsToSave(result, decisions), publishMovie: mode === 'many' && request.body.publishMovie, skipConflicts: false, dryRun: false } });
      if (!done.created.length) { setError('No showings were saved. Review the schedule again.'); setRefresh((value) => value + 1); return; }
      const live = mode === 'many' && Boolean(done.moviePublished);
      const visibilityMessage = mode === 'copy' ? hidden ? 'These copies are hidden from customers.' : 'Copied showings keep their original visibility.' : live ? 'The movie is visible and tickets are on sale.' : chosenMovie?.status === 'draft' ? 'The movie is still a draft, hidden from customers.' : 'These showings are hidden from customers.';
      const skipped = result.skipped.filter((item) => item.kind !== 'clash' || decisions[slotKey(item)]?.type === 'skip');
      const saved = { ...done, skipped, skippedCount: skipped.length, requested: result.requested, visibilityMessage };
      onDone(`${plural(done.created.length, 'showing')} scheduled${skipped.length ? `, ${skipped.length} left out` : ''}. ${visibilityMessage}`, mode === 'many' ? chosenMovie?._id : null, mode === 'many' && span === 'one' ? oneDay : null, saved);
    } catch (err) {
      setError(`${reasons(err)} The schedule may have changed while you were deciding, so it is being checked again.`);
      setRefresh((value) => value + 1);
    } finally {
      saving.current = false;
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
          <label>First day<DatePicker label="First day" required min={today()} max={customDates.endDate} value={customDates.startDate} onChange={startDate => setCustomDates({ ...customDates, startDate })} /></label>
          <label>Last day<DatePicker label="Last day" required min={customDates.startDate > today() ? customDates.startDate : today()} value={customDates.endDate} onChange={endDate => setCustomDates({ ...customDates, endDate })} /></label>
        </div>
      )}
      {dates.startDate && dates.endDate && dates.endDate >= dates.startDate && <p className="bulk-hint">{dayLabel(dates.startDate)} to {dayLabel(dates.endDate)} · {daysBetween(dates.startDate, dates.endDate).length} days</p>}
    </>
  );

  return (
    <Drawer title={mode === 'copy' ? 'Copy a day' : span === 'one' ? 'Add showings' : 'Schedule showings'} onClose={() => { if (!saving.current) onClose(); }} className="admin-drawer-planner">
      <fieldset className="bulk-save-fields" disabled={busy} aria-busy={busy}>
      <div className="planner-grid">
      <div className="planner-inputs">
      {onBack && <button type="button" className="bulk-link" onClick={onBack}>← Back to movie details</button>}
      {lockedMovie && <div className="movie-flow-intro"><ol className="movie-flow-steps" aria-label="Create movie progress"><li><b>✓</b> Details saved</li><li aria-current="step"><b>2</b> Showings & publish</li></ol><p>Choose showtimes, review conflicts, then publish the movie and tickets together. All times are in Manila.</p></div>}
      {!lockedMovie && <div className="when-chips bulk-mode" role="group" aria-label="What to do">
        <button type="button" className={`when-chip${mode === 'many' ? ' active' : ''}`} aria-pressed={mode === 'many'} onClick={() => onModeChange('many')}>New showings</button>
        <button type="button" className={`when-chip${mode === 'copy' ? ' active' : ''}`} aria-pressed={mode === 'copy'} onClick={() => onModeChange('copy')}>Copy a day</button>
      </div>}
      <Feedback error={error || roomError} notice="" />
      {roomError && <button type="button" className="btn btn-secondary" onClick={onRetryRooms}>Retry loading rooms</button>}

      {mode === 'many' ? (
        <div className="bulk-steps">
          <section className="bulk-step">
            <h3><span>1</span> Movie and room</h3>
            <label>Movie
              <select disabled={lockedMovie} value={chosenMovie?._id || ''} onChange={(event) => setMovie(event.target.value)}>
                {published.map((item) => <option key={item._id} value={item._id}>{item.title} ({item.duration} min){item.status === 'draft' ? ' · draft' : ''}</option>)}
              </select>
            </label>
            <label>Room
              <select value={chosenRoom?._id || ''} onChange={(event) => setRoom(event.target.value)}>
                {active.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.rows * item.seatsPerRow} seats</option>)}
              </select>
            </label>
          </section>

          {!active.length && <p className="bulk-problem">No active rooms. Your movie is saved.{onManageRooms && <button type="button" className="bulk-link" onClick={onManageRooms}>Set up a room →</button>}</p>}
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
                  <DatePicker label="Showing day" required min={today()} value={oneDay} onChange={setOneDay} />
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
            {timeProblem && <p className="when-problem" role="alert">{timeProblem}</p>}
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
            <p className="bulk-hint">{chosenMovie?.status === 'draft' && (!publishMovie || hidden) ? 'Save schedule only: the movie stays a draft, hidden from customers.' : hidden ? 'These showings cannot be booked until you make them visible.' : 'Customers can book these showings as soon as you finish.'}</p>
          </section>
        </div>
      ) : (
        <div className="bulk-steps">
          <section className="bulk-step">
            <h3><span>1</span> Which day to copy</h3>
            <label>Copy the showings of<DatePicker label="Copy source day" required value={copyFrom} onChange={setCopyFrom} /></label>
          </section>
          <section className="bulk-step">
            <h3><span>2</span> Copy it to</h3>
            {rangePicker(copyRange, setCopyRange, copyDates, copyCustom, setCopyCustom)}
            <label className="admin-check"><input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} /> Keep the copies hidden from customers until I publish them</label>
          </section>
        </div>
      )}

      </div>
      <div className="planner-review">
        {preview?.problem
          ? <p className="bulk-problem" role="alert">{preview.problem}</p>
          : !result
            ? <div className="planner-review-empty">{checking ? 'Checking the schedule…' : 'Choose a movie, a room, days and times. The plan appears here with anything that clashes.'}</div>
            : <PlanReview result={result} decisions={decisions} setDecisions={setDecisions} collisions={collisions} gapMinutes={gapMinutes} rooms={rooms} movies={movies} />}
      </div>
      </div>

      <div className="bulk-footer">
        <div className="bulk-result" aria-live="polite">
          {checking && <p className="bulk-hint">Checking the schedule…</p>}
          {!checking && result && !preview?.problem && (
            counts.open > 0
              ? <p className="planner-status">{plural(counts.open, 'clash')} still {counts.open === 1 ? 'needs' : 'need'} a decision.</p>
              : counts.total === 0
                ? <p className="bulk-problem">Nothing can be scheduled with these choices. Pick other times or days{mode === 'many' ? ', or another room' : ''}.</p>
                : <p className="planner-status">
                  <b>{counts.total}</b> showing{counts.total === 1 ? '' : 's'} will be scheduled
                  {mode === 'many' && chosenMovie && chosenRoom ? <> for <b>{chosenMovie.title}</b>{counts.fixed === 0 ? <> in {chosenRoom.name}, {span === 'one' ? `on ${dayLabel(oneDay)}` : weekdaySummary}</> : null}, at {pesos(Math.round(Number(price) * 100))} a seat</> : null}
                  {counts.fixed > 0 ? `, ${counts.fixed} of them fixed` : ''}{counts.skipped > 0 ? `, ${counts.skipped} left out` : ''}.
                </p>
          )}
        </div>
        {unavailable > 0 && counts.total > 0 && <label className="admin-check bulk-skip-choice"><input type="checkbox" checked={skipUnavailable} onChange={(event) => setSkipUnavailable(event.target.checked)} /> Leave out the {unavailable} unavailable time{unavailable === 1 ? '' : 's'} and save only the reviewed showings</label>}
        <button type="button" className="btn btn-primary" disabled={busy || checking || !result || counts.open > 0 || counts.total === 0 || (unavailable > 0 && !skipUnavailable)} aria-busy={busy} onClick={schedule}>
          <ActionPending pending={busy}>{busy ? 'Scheduling…' : checking ? 'Checking…' : counts.open > 0 ? `Decide ${plural(counts.open, 'clash')} first` : counts.total > 0 ? `${chosenMovie?.status === 'draft' && request.body?.publishMovie ? 'Publish movie & save' : mode === 'copy' ? 'Copy' : 'Save'} ${plural(counts.total, 'showing')}` : 'Nothing to schedule yet'}</ActionPending>
        </button>
      </div>
      </fieldset>
    </Drawer>
  );
}
