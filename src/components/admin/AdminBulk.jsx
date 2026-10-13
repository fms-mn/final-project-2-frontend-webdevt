import { useEffect, useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import { parseTimes } from '../../utils/adminTools';
import { daysBetween, shiftDay, today } from '../../utils/manila';
import Drawer from './Drawer';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_DAYS = 31;

// Schedule one movie at several times over a range of days, or copy one day's showings to other days.
// Every request is first run as a preview (nothing saved), so the admin sees what would happen.
export default function AdminBulk({ movies, rooms, onDone, scheduleFor, open, mode, onModeChange, onClose, defaultDay }) {
  const { busy, busyAction, error, notice, setError, run, clear } = useAdminAction();
  const published = movies.filter((movie) => movie.status === 'published');
  const active = rooms.filter((room) => room.isActive);
  const [many, setMany] = useState({
    movie: '', auditorium: '', startDate: shiftDay(today(), 1), endDate: shiftDay(today(), 7), times: '10:00, 13:30, 17:00, 20:30', price: '400', weekdays: [0, 1, 2, 3, 4, 5, 6],
  });
  const [copy, setCopy] = useState({ fromDate: today(), toFrom: shiftDay(today(), 1), toTo: shiftDay(today(), 7) });
  const [hidden, setHidden] = useState(false);
  const [skip, setSkip] = useState(false);
  const [preview, setPreview] = useState(null);

  // Arriving from "Schedule showings" after adding a movie: that movie is already chosen.
  useEffect(() => {
    if (!scheduleFor) return;
    setMany((current) => ({ ...current, movie: scheduleFor.movieId }));
    setPreview(null);
  }, [scheduleFor]);
  // Opening from a day on the schedule starts the range on that day.
  useEffect(() => {
    if (!open || !defaultDay) return;
    setMany((current) => ({ ...current, startDate: defaultDay, endDate: current.endDate < defaultDay ? shiftDay(defaultDay, 6) : current.endDate }));
    setCopy((current) => ({ ...current, fromDate: defaultDay }));
  }, [open, defaultDay]);

  const build = (dryRun) => {
    if (mode === 'many') {
      const times = parseTimes(many.times);
      if (!times) throw new Error('Type start times such as 10:00, 13:30 (cinema time).');
      return ['/showtimes/bulk', {
        movie: many.movie || published[0]?._id, auditorium: many.auditorium || active[0]?._id,
        startDate: many.startDate, endDate: many.endDate, times,
        weekdays: many.weekdays.length === 7 ? undefined : many.weekdays,
        ticketPrice: Math.round(Number(many.price) * 100), published: !hidden, skipConflicts: skip, dryRun,
      }];
    }
    const toDates = daysBetween(copy.toFrom, copy.toTo);
    if (toDates.length === 0 || toDates.length > MAX_DAYS) throw new Error(`Pick 1 to ${MAX_DAYS} days to copy to.`);
    return ['/showtimes/copy', {
      fromDate: copy.fromDate, toDates, skipConflicts: skip, dryRun, ...(hidden ? { published: false } : {}),
    }];
  };

  if (!open) return null;

  const send = async (dryRun) => {
    clear();
    let request;
    try { request = build(dryRun); } catch (err) { setError(err.message); return; }
    let result = null;
    const done = await run(async () => { result = await api(request[0], { method: 'POST', body: request[1] }); },
      dryRun ? 'Preview ready. Nothing is saved yet' : '', dryRun ? 'preview' : 'schedule');
    if (!done) { setPreview(null); return; }
    if (dryRun) { setPreview(result); return; }
    setPreview(null);
    onDone(`${result.createdCount} showing${result.createdCount === 1 ? '' : 's'} scheduled${result.skippedCount ? `, ${result.skippedCount} skipped` : ''}`);
  };

  const weekday = (index) => (event) => setMany({
    ...many, weekdays: event.target.checked ? [...many.weekdays, index].sort() : many.weekdays.filter((day) => day !== index),
  });
  const edit = (field) => (event) => { setPreview(null); setMany({ ...many, [field]: event.target.value }); };
  const editCopy = (field) => (event) => { setPreview(null); setCopy({ ...copy, [field]: event.target.value }); };

  return (
    <Drawer title={mode === 'many' ? 'Schedule many showings' : 'Copy a day'} onClose={onClose} wide>
      <div className="period-picker" role="group" aria-label="What to do">
        <button type="button" className={`filter-btn ${mode === 'many' ? 'active' : ''}`} aria-pressed={mode === 'many'} onClick={() => { onModeChange('many'); setPreview(null); clear(); }}>One movie, many times</button>
        <button type="button" className={`filter-btn ${mode === 'copy' ? 'active' : ''}`} aria-pressed={mode === 'copy'} onClick={() => { onModeChange('copy'); setPreview(null); clear(); }}>Copy a day</button>
      </div>
      <Feedback error={error} notice={notice} />
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); send(true); }}>
        {mode === 'many' ? (
          <>
            <label>Movie
              <select value={many.movie || published[0]?._id || ''} onChange={edit('movie')} required>
                {published.map((movie) => <option key={movie._id} value={movie._id}>{movie.title} ({movie.duration} min)</option>)}
              </select>
            </label>
            <label>Room
              <select value={many.auditorium || active[0]?._id || ''} onChange={edit('auditorium')} required>
                {active.map((room) => <option key={room._id} value={room._id}>{room.name}</option>)}
              </select>
            </label>
            <label>From day<input type="date" required value={many.startDate} onChange={edit('startDate')} /></label>
            <label>To day<input type="date" required min={many.startDate} value={many.endDate} onChange={edit('endDate')} /></label>
            <label>Start times (cinema time)<input required value={many.times} onChange={edit('times')} placeholder="10:00, 13:30, 17:00" /></label>
            <label>Price per seat (₱)<input type="number" min="0" step="0.01" required value={many.price} onChange={edit('price')} /></label>
            <fieldset className="weekday-row"><legend>Days of the week</legend>
              {WEEKDAYS.map((name, index) => (
                <label key={name} className="admin-check"><input type="checkbox" checked={many.weekdays.includes(index)} onChange={weekday(index)} /> {name}</label>
              ))}
            </fieldset>
          </>
        ) : (
          <>
            <label>Copy the showings of<input type="date" required value={copy.fromDate} onChange={editCopy('fromDate')} /></label>
            <label>to every day from<input type="date" required value={copy.toFrom} onChange={editCopy('toFrom')} /></label>
            <label>until<input type="date" required min={copy.toFrom} value={copy.toTo} onChange={editCopy('toTo')} /></label>
          </>
        )}
        <label className="admin-check"><input type="checkbox" checked={hidden} onChange={(event) => { setHidden(event.target.checked); setPreview(null); }} /> Keep them hidden from customers until I publish them</label>
        <label className="admin-check"><input type="checkbox" checked={skip} onChange={(event) => { setSkip(event.target.checked); setPreview(null); }} /> If some times clash, schedule the rest and skip those</label>
        <div className="admin-actions">
          <button type="submit" className="btn btn-secondary btn-small" disabled={busy} aria-busy={busyAction === 'preview'}><ActionPending pending={busyAction === 'preview'}>{busyAction === 'preview' ? 'Checking...' : 'Preview'}</ActionPending></button>
        </div>
      </form>

      {preview && (
        <div className="bulk-preview" role="status">
          <p><strong>{preview.createdCount}</strong> of {preview.requested} showing{preview.requested === 1 ? '' : 's'} can be scheduled{preview.skippedCount ? `; ${preview.skippedCount} cannot:` : '.'}</p>
          {preview.skippedCount > 0 && (
            <ul>{preview.skipped.slice(0, 12).map((item) => <li key={item.startTime}><b>{item.label}</b>: {item.reason}</li>)}{preview.skippedCount > 12 && <li>and {preview.skippedCount - 12} more</li>}</ul>
          )}
          {preview.skippedCount > 0 && !skip && <p className="admin-warning">Tick &quot;schedule the rest and skip those&quot; to go ahead without them, or change the times.</p>}
          <div className="admin-actions">
            <button type="button" className="btn btn-primary btn-small" disabled={busy || preview.createdCount === 0 || (preview.skippedCount > 0 && !skip)} aria-busy={busyAction === 'schedule'} onClick={() => send(false)}>
              <ActionPending pending={busyAction === 'schedule'}>{busyAction === 'schedule' ? 'Scheduling...' : `Schedule ${preview.createdCount} showing${preview.createdCount === 1 ? '' : 's'}`}</ActionPending>
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
