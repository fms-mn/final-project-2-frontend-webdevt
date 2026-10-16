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

const MAX_DAYS = 31;
// Monday first, as people read a week. The number is what the server expects (Sunday = 0).
const WEEKDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const dayLabel = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', day: 'numeric', month: 'short' });

// Schedule many showings, or copy one day to other days. The admin taps a movie, a room, some days
// and some times; the screen works out the rest and checks it against the schedule as they go, so
// "Schedule 27 showings" is a button they press once they have seen what will happen.
export default function AdminBulk({ movies, rooms, onDone, scheduleFor, open, mode, onModeChange, onClose, defaultDay, preset }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Drafts can be scheduled too (customers see the showings once the movie is published); archived ones cannot.
  const published = movies.filter((movie) => movie.status !== 'archived');
  const active = rooms.filter((room) => room.isActive);

  const [movie, setMovie] = useState('');
  const [room, setRoom] = useState('');
  const [span, setSpan] = useState('many'); // 'one': just one day, 'many': a range of days
  const [oneDay, setOneDay] = useState(today());
  const [range, setRange] = useState('next7');
  const [custom, setCustom] = useState({ startDate: shiftDay(today(), 1), endDate: shiftDay(today(), 7) });
  const [weekdays, setWeekdays] = useState(ALL_DAYS);
  const [times, setTimes] = useState(['10:00', '13:30', '17:00', '20:30']);
  const [price, setPrice] = useState('400');
  const [hidden, setHidden] = useState(false);
  const [copyFrom, setCopyFrom] = useState(today());
  const [copyRange, setCopyRange] = useState('next7');
  const [copyCustom, setCopyCustom] = useState({ startDate: shiftDay(today(), 1), endDate: shiftDay(today(), 7) });
  const [preview, setPreview] = useState(null); // { ok, result } | { problem }
  const [checking, setChecking] = useState(false);
  const ticket = useRef(0);
  const saving = useRef(false);

  // Arriving from "Schedule showings" after adding a movie: that movie is already chosen.
  useEffect(() => { if (scheduleFor) setMovie(scheduleFor.movieId); }, [scheduleFor]);
  // Opened from "+ Add showing" (one day, maybe a clicked time and room) or from "Many days".
  useEffect(() => {
    if (!open || !preset) return;
    setError('');
    setSpan(preset.span || 'many');
    if (preset.span === 'one') {
      const day = preset.day || today();
      setOneDay(day);
      setTimes([preset.time || defaultStart(day).split('T')[1]]);
    }
    if (preset.room) setRoom(preset.room);
    setPreview(null);
  }, [open, preset]);
  // Opening from a day on the schedule: copy that day, and start the new showings after it.
  useEffect(() => {
    if (!open || !defaultDay) return;
    setCopyFrom(defaultDay);
  }, [open, defaultDay]);

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
      if (span === 'many' && weekdays.length === 0) return { problem: 'Pick at least one day of the week.' };
      const cents = Math.round(Number(price) * 100);
      if (!Number.isFinite(cents) || cents < 0 || price === '') return { problem: 'Enter the price per seat.' };
      if (!manyDates.startDate || !manyDates.endDate || manyDates.endDate < manyDates.startDate) return { problem: 'Choose the first and last day.' };
      if (daysBetween(manyDates.startDate, manyDates.endDate).length > MAX_DAYS) return { problem: `Choose at most ${MAX_DAYS} days at a time.` };
      return {
        path: '/showtimes/bulk',
        body: {
          movie: chosenMovie._id, auditorium: chosenRoom._id, startDate: manyDates.startDate, endDate: manyDates.endDate, times,
          weekdays: span === 'one' || weekdays.length === 7 ? undefined : weekdays, ticketPrice: cents, published: !hidden,
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
  }, [mode, span, chosenMovie, chosenRoom, times, weekdays, price, manyDates.startDate, manyDates.endDate, hidden, copyFrom, copyDates.startDate, copyDates.endDate, timeProblem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check the request against the schedule a moment after the admin stops changing things.
  useEffect(() => {
    if (!open) return undefined;
    if (request.problem) { setPreview({ problem: request.problem }); setChecking(false); return undefined; }
    const mine = ticket.current + 1;
    ticket.current = mine;
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api(request.path, { method: 'POST', body: { ...request.body, skipConflicts: true, dryRun: true } });
        if (ticket.current === mine) setPreview({ result });
      } catch (err) {
        if (ticket.current === mine) setPreview({ problem: reasons(err) });
      } finally {
        if (ticket.current === mine) setChecking(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [open, request]);

  if (!open) return null;

  const result = preview?.result;
  const skipped = result?.skippedCount || 0;
  const count = result?.createdCount || 0;

  const schedule = async () => {
    if (saving.current || checking || !result || count === 0) return;
    const dates = mode === 'many' ? manyDates : copyDates;
    const invalidDate = (mode === 'copy' && dateProblem(copyFrom, { required: true })) || dateProblem(dates.startDate, { min: today(), required: true }) || dateProblem(dates.endDate, { min: dates.startDate, required: true });
    if (invalidDate) { setError(invalidDate); return; }
    if (mode === 'many' && daysBetween(dates.startDate, dates.endDate).some(day => (!request.body.weekdays || request.body.weekdays.includes(new Date(`${day}T12:00:00+08:00`).getUTCDay())) && times.some(time => Date.parse(`${day}T${time}:00+08:00`) <= Date.now()))) { setError('A selected showtime has already passed. Choose later times or another day.'); return; }
    saving.current = true;
    setError('');
    setBusy(true);
    try {
      const done = await api(request.path, { method: 'POST', body: { ...request.body, skipConflicts: skipped > 0, dryRun: false } });
      if (!done.created.length) {
        setError(['No showings were scheduled.', ...done.skipped.map(item => `${item.label}: ${item.reason}`)].join(' '));
        return;
      }
      onDone(`${done.created.length} showing${done.created.length === 1 ? '' : 's'} scheduled${done.skippedCount ? `, ${done.skippedCount} skipped` : ''}`, mode === 'many' ? chosenMovie?._id : null, mode === 'many' && span === 'one' ? oneDay : null, done);
    } catch (err) {
      setError(reasons(err));
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
    <Drawer title={mode === 'copy' ? 'Copy a day' : span === 'one' ? 'Add showings' : 'Schedule showings'} onClose={() => { if (!saving.current) onClose(); }} wide>
      <fieldset className="bulk-save-fields" disabled={busy} aria-busy={busy}>
      <div className="when-chips bulk-mode" role="group" aria-label="What to do">
        <button type="button" className={`when-chip${mode === 'many' ? ' active' : ''}`} aria-pressed={mode === 'many'} onClick={() => onModeChange('many')}>New showings</button>
        <button type="button" className={`when-chip${mode === 'copy' ? ' active' : ''}`} aria-pressed={mode === 'copy'} onClick={() => onModeChange('copy')}>Copy a day</button>
      </div>
      <Feedback error={error} notice="" />

      {mode === 'many' ? (
        <div className="bulk-steps">
          <section className="bulk-step">
            <h3><span>1</span> Movie and room</h3>
            <label>Movie
              <select value={chosenMovie?._id || ''} onChange={(event) => setMovie(event.target.value)}>
                {published.map((item) => <option key={item._id} value={item._id}>{item.title} ({item.duration} min){item.status === 'draft' ? ' · draft' : ''}</option>)}
              </select>
            </label>
            <label>Room
              <select value={chosenRoom?._id || ''} onChange={(event) => setRoom(event.target.value)}>
                {active.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.rows * item.seatsPerRow} seats</option>)}
              </select>
            </label>
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
            <h3><span>4</span> Price</h3>
            <label>Price per seat (₱)<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
            <label className="admin-check"><input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} /> Keep them hidden from customers until I publish them</label>
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

      <div className="bulk-footer">
        <div className="bulk-result" aria-live="polite">
          {preview?.problem && <p className="bulk-problem">{preview.problem}</p>}
          {checking && !preview?.problem && <p className="bulk-hint">Checking the schedule…</p>}
          {!checking && result && (
            <>
              <p className="bulk-count">
                <b>{count}</b> showing{count === 1 ? '' : 's'} will be scheduled
                {mode === 'many' && chosenMovie && chosenRoom && count > 0 ? <> for <b>{chosenMovie.title}</b> in {chosenRoom.name}, {span === 'one' ? `on ${dayLabel(oneDay)}` : weekdaySummary}, at {pesos(Math.round(Number(price) * 100))} a seat</> : null}.
              </p>
              {count === 0 && skipped > 0 && <p className="bulk-problem">Every one of these times clashes with something already scheduled (or has passed). Pick other times or days{mode === 'many' ? ', or another room' : ''}.</p>}
              {skipped > 0 && (
                <details className="bulk-skipped">
                  <summary>{skipped} time{skipped === 1 ? '' : 's'} will be skipped (a clash or a time that has passed)</summary>
                  <ul>
                    {result.skipped.slice(0, 12).map((item) => <li key={item.startTime}><b>{item.label}</b>: {item.reason}</li>)}
                    {skipped > 12 && <li>and {skipped - 12} more</li>}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
        <button type="button" className="btn btn-primary" disabled={busy || checking || !result || count === 0} aria-busy={busy} onClick={schedule}>
          <ActionPending pending={busy}>{busy ? 'Scheduling…' : count > 0 ? `${mode === 'copy' ? 'Copy' : 'Schedule'} ${count} showing${count === 1 ? '' : 's'}` : 'Nothing to schedule yet'}</ActionPending>
        </button>
      </div>
      </fieldset>
    </Drawer>
  );
}
