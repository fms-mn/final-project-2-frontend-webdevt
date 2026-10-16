import { useEffect, useMemo, useRef, useState } from 'react';
import { api, apiAll } from '../../api';
import ActionPending from '../ActionPending';
import { describeError, pesos } from '../../utils/adminTools';
import { dayHeading, fromInputValue, manilaClock, manilaDay, minutesOfDay, shiftDay, shortDate, toInputValue, today } from '../../utils/manila';
import { findClash } from '../../utils/clashes';
import { movieColor, timeAtFraction, weekDays, weekLabel } from '../../utils/schedule';
import AdminBulk from './AdminBulk';
import ScheduleSuccess from './ScheduleSuccess';
import Drawer from './Drawer';
import WhenPicker from './WhenPicker';
import Feedback from './Feedback';
import SeatGrid from './SeatGrid';
import useAdminAction from './useAdminAction';
import './adminShowings.css';

const seatsSold = (showing) => showing.totalSeats - showing.remainingSeats;
const byStart = (a, b) => new Date(a.startTime) - new Date(b.startTime);
const weekdayShort = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' });
const dayNumber = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'short' });

// Where a showing sits on the day's timeline, as percentages of the visible hours.
function place(showing, from, to) {
  const start = minutesOfDay(showing.startTime);
  const length = (new Date(showing.endTime) - new Date(showing.startTime)) / 60000;
  const span = (to - from) * 60;
  const left = Math.max(0, ((start - from * 60) / span) * 100);
  const width = Math.min(100 - left, Math.max(6, (length / span) * 100));
  return { left: `${left}%`, width: `${width}%` };
}

export default function AdminShowings({ movies, scheduleFor, focusShowing, reloadMovies }) {
  const { busy, busyAction, error, notice, setError, setNotice, clear, run } = useAdminAction();
  const [view, setView] = useState('day'); // 'day' or 'week'
  const [date, setDate] = useState(today());
  const [rooms, setRooms] = useState([]);
  const [byDay, setByDay] = useState({}); // { 'YYYY-MM-DD': showings } for the days on screen
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [revision, setRevision] = useState(0);
  const [move, setMove] = useState({ startTime: '', auditorium: '' });
  const [blockedDraft, setBlockedDraft] = useState([]);
  const [bulk, setBulk] = useState({ open: false, mode: 'many', preset: null });
  const [scheduleResult, setScheduleResult] = useState(null);
  const [publishPrompt, setPublishPrompt] = useState(null); // a draft movie that just got showings: { id, title }
  const [gapMinutes, setGapMinutes] = useState(15); // the cinema's gap between shows
  const [otherDays, setOtherDays] = useState({}); // showings of days picked in a form that are not on screen

  // Every change to the schedule changes the showing counts the Movies screen shows, so refresh them.
  const firstRevision = useRef(true);
  useEffect(() => {
    if (firstRevision.current) { firstRevision.current = false; return; }
    reloadMovies?.();
  }, [revision]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleDays = useMemo(() => (view === 'week' ? weekDays(date) : [date]), [view, date]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api('/auditoriums', { signal: controller.signal }),
      ...visibleDays.map((day) => apiAll(`/admin/showtimes?date=${day}`, { signal: controller.signal })),
    ])
      .then(([roomList, ...lists]) => {
        setRooms(roomList);
        setByDay(Object.fromEntries(visibleDays.map((day, index) => [day, lists[index].sort(byStart)])));
      })
      .catch((err) => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [visibleDays, revision, setError]);

  useEffect(() => {
    api('/admin/settings').then((rules) => setGapMinutes(rules.turnaroundMinutes)).catch(() => {});
  }, []);

  // The form can pick any day, so look up that day's showings to warn about clashes.
  const formDays = [draft?.startTime, move.startTime].map((value) => String(value || '').split('T')[0]).filter(Boolean);
  const formDaysKey = formDays.join('|');
  useEffect(() => { setOtherDays({}); }, [revision]);
  useEffect(() => {
    const missing = [...new Set(formDaysKey.split('|').filter(Boolean))].filter((day) => !byDay[day] && !otherDays[day]);
    if (missing.length === 0) return undefined;
    let current = true;
    Promise.all(missing.map((day) => apiAll(`/admin/showtimes?date=${day}`).then((rows) => [day, rows]).catch(() => [day, []])))
      .then((pairs) => { if (current) setOtherDays((existing) => ({ ...existing, ...Object.fromEntries(pairs) })); });
    return () => { current = false; };
  }, [formDaysKey, byDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coming from "Schedule showings" after adding a movie: open the scheduler with it chosen.
  useEffect(() => {
    if (scheduleFor) setBulk({ open: true, mode: 'many', preset: { span: 'many' } });
  }, [scheduleFor]);

  // Arriving from a movie's panel: go to that showing's day, then open it.
  const [pendingId, setPendingId] = useState('');
  useEffect(() => {
    if (!focusShowing) return;
    setView('day');
    setDate(focusShowing.day);
    setPendingId(focusShowing.id);
  }, [focusShowing]);

  const everything = useMemo(() => Object.values(byDay).flat(), [byDay]);
  const showings = byDay[date] || [];
  const selected = everything.find((row) => row._id === selectedId);
  // Drafts can be scheduled too: customers see the showings once the movie is published. Archived movies cannot.
  const publishedMovies = useMemo(() => movies.filter((movie) => movie.status !== 'archived'), [movies]);
  const activeRooms = useMemo(() => rooms.filter((room) => room.isActive), [rooms]);
  const canAdd = publishedMovies.length > 0 && activeRooms.length > 0;

  // Hours shown: 10:00 to 22:00, stretched when a showing starts earlier or ends later.
  const hours = useMemo(() => {
    let from = 10;
    let to = 22;
    for (const row of showings) {
      from = Math.min(from, Math.floor(minutesOfDay(row.startTime) / 60));
      const end = minutesOfDay(row.startTime) + (new Date(row.endTime) - new Date(row.startTime)) / 60000;
      to = Math.max(to, Math.ceil(end / 60));
    }
    to = Math.min(to, 24);
    return { from, to, marks: Array.from({ length: Math.floor((to - from) / 2) + 1 }, (_, i) => from + i * 2).filter((hour) => hour < 24) };
  }, [showings]);

  useEffect(() => {
    if (!pendingId) return;
    const row = (byDay[date] || []).find((item) => item._id === pendingId);
    if (row) { choose(row); setPendingId(''); }
  }, [pendingId, byDay, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const startedOrCancelled = selected && (selected.status !== 'scheduled' || new Date(selected.startTime) <= new Date());
  const locked = Boolean(selected && (startedOrCancelled || seatsSold(selected) > 0));

  const closePanel = () => { setSelectedId(''); setDraft(null); setConfirmCancel(false); clear(); };

  const choose = (showing) => {
    setSelectedId(showing._id);
    setConfirmCancel(false);
    clear();
    setDraft({
      movie: showing.movie?._id || '',
      auditorium: showing.auditorium?._id || '',
      startTime: toInputValue(showing.startTime),
      ticketPrice: String(showing.ticketPrice / 100),
    });
    setMove({ startTime: toInputValue(showing.startTime), auditorium: showing.auditorium?._id || '' });
    setBlockedDraft(showing.blockedSeats || []);
  };

  // "+ Add showing": the scheduler, set to one day (the one on screen, or the one clicked), where any
  // number of start times can be ticked. A clicked time and room are already chosen.
  const startAdd = ({ day = date, time, room } = {}) => {
    clear();
    setBulk({ open: true, mode: 'many', preset: { span: 'one', day, time, room, stamp: Date.now() } });
  };

  const goToDay = (day) => {
    if (!day) return;
    setDate(day);
    closePanel();
  };
  const step = (direction) => goToDay(shiftDay(date, direction * (view === 'week' ? 7 : 1)));
  const openDay = (day) => { setView('day'); goToDay(day); };

  const save = async (event) => {
    event.preventDefault();
    const startTime = fromInputValue(draft.startTime);
    if (!startTime) { setError('Choose a start date and time.'); return; }
    const body = { movie: draft.movie, auditorium: draft.auditorium, startTime, ticketPrice: Math.round(Number(draft.ticketPrice) * 100) };
    const done = await run(() => api(`/showtimes/${selectedId}`, { method: 'PATCH', body }), 'Showing updated', 'save');
    if (done) { setSelectedId(''); setDraft(null); setRevision((value) => value + 1); }
  };

  const cancelShowing = async () => {
    if (!confirmCancel) { setConfirmCancel(true); return; }
    const done = await run(() => api(`/showtimes/${selectedId}/cancel`, { method: 'PATCH' }), 'Showing cancelled. Its bookings were cancelled and the seats freed', 'cancel');
    if (done) { setConfirmCancel(false); setSelectedId(''); setDraft(null); setRevision((value) => value + 1); }
  };

  const afterChange = () => setRevision((value) => value + 1);

  // Showings for a movie that is still a draft are hidden from customers: offer to publish it.
  const askToPublish = (movieId) => {
    const movie = movies.find((item) => item._id === movieId);
    setPublishPrompt(movie && movie.status === 'draft' ? { id: movie._id, title: movie.title } : null);
  };
  const publishMovie = async () => {
    const done = await run(() => api(`/admin/movies/${publishPrompt.id}`, { method: 'PATCH', body: { status: 'published' } }), `"${publishPrompt.title}" is published. Its showings are now on sale.`, 'publish');
    if (done) { setPublishPrompt(null); reloadMovies?.(); }
  };

  const moveShowing = async (event) => {
    event.preventDefault();
    const startTime = fromInputValue(move.startTime);
    if (!startTime) { setError('Choose the new start date and time.'); return; }
    const done = await run(
      () => api(`/showtimes/${selectedId}/reschedule`, { method: 'PATCH', body: { startTime, auditorium: move.auditorium } }),
      'Showing moved. Customers keep their seats and the price they paid', 'move',
    );
    if (done) { setSelectedId(''); setDraft(null); afterChange(); }
  };

  const toggleVisibility = async () => {
    const done = await run(
      () => api(`/showtimes/${selectedId}/visibility`, { method: 'PATCH', body: { published: !selected.published } }),
      selected.published ? 'Showing hidden from customers' : 'Showing is now visible to customers', 'visibility',
    );
    if (done) { setSelectedId(''); setDraft(null); afterChange(); }
  };

  const saveBlocked = async () => {
    const done = await run(
      () => api(`/showtimes/${selectedId}/blocked-seats`, { method: 'PUT', body: { seats: blockedDraft } }),
      blockedDraft.length ? `${blockedDraft.length} seat${blockedDraft.length === 1 ? '' : 's'} blocked for this showing` : 'No seats are blocked for this showing', 'blocked',
    );
    if (done) afterChange();
  };

  const edit = (field) => (event) => setDraft({ ...draft, [field]: event.target.value });
  const selectedRoom = selected && rooms.find((room) => room._id === selected.auditorium?._id);
  const canManage = Boolean(selected && selected.status === 'scheduled' && !startedOrCancelled);

  // A click on an empty part of a room's row starts a showing there, at that time.
  const clickTrack = (room) => (event) => {
    if (event.target !== event.currentTarget || !canAdd || !room.isActive) return;
    const box = event.currentTarget.getBoundingClientRect();
    startAdd({ time: timeAtFraction((event.clientX - box.left) / box.width, hours.from, hours.to), room: room._id });
  };

  const tags = (row) => (
    <>
      {row.status === 'cancelled' && <span className="admin-status cancelled">cancelled</span>}
      {row.status === 'scheduled' && !row.published && <span className="admin-status hidden-tag">hidden</span>}
      {row.rescheduledAt && <span className="admin-status moved-tag" title={`First planned for ${shortDate(row.originalStartTime)} ${manilaClock(row.originalStartTime)}`}>moved</span>}
    </>
  );

  // A warning when the chosen room, day and time would collide with another showing.
  const clashWarning = (when, roomId, minutes, ignoreId) => {
    const [whenDay, whenTime] = String(when || '').split('T');
    const startIso = fromInputValue(when);
    if (!startIso || !minutes || !roomId) return '';
    const startMs = new Date(startIso).getTime();
    const clash = findClash(byDay[whenDay] || otherDays[whenDay] || [], { auditorium: roomId, startMs, endMs: startMs + minutes * 60000, gapMinutes, ignoreId });
    if (!clash) return '';
    return `${clash.movie?.title} is on in this room from ${manilaClock(clash.startTime)} to ${manilaClock(clash.endTime)}. The room needs ${gapMinutes} minutes between shows, so pick another time or room.`;
  };
  const draftMovie = draft && movies.find((movie) => movie._id === draft.movie);
  const draftMinutes = draftMovie?.duration || (selected ? (new Date(selected.endTime) - new Date(selected.startTime)) / 60000 : 0);

  const panelOpen = Boolean(draft);
  const panelTitle = selected?.movie?.title || 'Showing';

  return (
    <>
      <Feedback error={panelOpen ? '' : error} notice={notice} />
      {publishPrompt && (
        <div className="admin-notice publish-prompt" role="status">
          <span>Showings are scheduled for <b>{publishPrompt.title}</b>, but it is still a draft, so customers can&apos;t see them yet.</span>
          <span className="publish-prompt-actions">
            <button type="button" className="btn btn-primary btn-small" disabled={busy} aria-busy={busyAction === 'publish'} onClick={publishMovie}>{busyAction === 'publish' ? 'Publishing...' : `Publish ${publishPrompt.title} now`}</button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setPublishPrompt(null)}>Later</button>
          </span>
        </div>
      )}

      <div className="admin-panel show-toolbar">
        <div className="show-toolbar-nav">
          <div className="show-segment" role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'day'} className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Day</button>
            <button type="button" aria-pressed={view === 'week'} className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Week</button>
          </div>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => step(-1)} aria-label={view === 'week' ? 'Previous week' : 'Previous day'}>←</button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => step(1)} aria-label={view === 'week' ? 'Next week' : 'Next day'}>→</button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => goToDay(today())} disabled={visibleDays.includes(today()) && (view === 'week' || date === today())}>Today</button>
          <input type="date" aria-label="Go to date" value={date} onChange={(event) => goToDay(event.target.value)} />
          <h2 className="show-toolbar-title">{view === 'week' ? weekLabel(date) : dayHeading(date)}</h2>
        </div>
        <div className="show-toolbar-actions">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setBulk({ open: true, mode: 'copy', preset: null })} disabled={!canAdd}>Copy a day</button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setBulk({ open: true, mode: 'many', preset: { span: 'many', stamp: Date.now() } })} disabled={!canAdd}>Many days</button>
          <button type="button" className="btn btn-primary btn-small" onClick={() => startAdd()} disabled={!canAdd}>+ Add showing</button>
        </div>
      </div>
      {!canAdd && <p className="admin-warning">To add a showing you need at least one movie (a draft is fine) and one active room. Add a movie in Movies, or a room in Rooms.</p>}

      {view === 'week' ? (
        <section className="week-board" aria-label="Week schedule">
          {visibleDays.map((day) => {
            const rows = byDay[day] || [];
            return (
              <div className={`week-day${day === today() ? ' is-today' : ''}`} key={day}>
                <div className="week-day-head">
                  <button type="button" className="week-day-link" onClick={() => openDay(day)} aria-label={`Open ${dayHeading(day)} in the day view`}>
                    <b>{weekdayShort(day)}</b><span>{dayNumber(day)}</span>
                  </button>
                  <small>{rows.length} {rows.length === 1 ? 'showing' : 'showings'}</small>
                </div>
                <div className="week-day-list">
                  {rows.length === 0 && <p className="week-empty">Nothing scheduled</p>}
                  {rows.map((row) => (
                    <button
                      type="button"
                      key={row._id}
                      className={`week-card ${row.status}${row.published ? '' : ' unpublished'}${selectedId === row._id ? ' selected' : ''}`}
                      style={{ '--movie-color': movieColor(row.movie?._id) }}
                      onClick={() => choose(row)}
                    >
                      <span className="week-card-time">{manilaClock(row.startTime)}</span>
                      <b>{row.movie?.title}</b>
                      <small>{row.auditorium?.name} · {row.remainingSeats}/{row.totalSeats} seats</small>
                      {tags(row)}
                    </button>
                  ))}
                </div>
                <button type="button" className="week-add" onClick={() => startAdd({ day })} disabled={!canAdd}>+ Add</button>
              </div>
            );
          })}
        </section>
      ) : (
        <>
          <section className="admin-panel" aria-label="Schedule">
            {rooms.length === 0 ? <p>No rooms yet. Add one in the Rooms tab first.</p> : (
              <>
                {showings.length === 0 && <p className="show-empty">No showings on this day yet. Click an empty spot on a room&apos;s row to add one at that time, or use <b>Schedule many</b> to fill several days.</p>}
                <div className="timeline-scroll">
                  <div className="timeline">
                    <div className="timeline-row timeline-hours" aria-hidden="true">
                      <span />
                      <div className="timeline-track plain">
                        {hours.marks.map((hour) => (
                          <span key={hour} className="mono" style={{ left: `${((hour - hours.from) / (hours.to - hours.from)) * 100}%` }}>{String(hour).padStart(2, '0')}:00</span>
                        ))}
                      </div>
                    </div>
                    {rooms.map((room) => (
                      <div className="timeline-row" key={room._id}>
                        <strong>{room.name}{room.isActive ? '' : ' (inactive)'}</strong>
                        <div className={`timeline-track${canAdd && room.isActive ? ' clickable' : ''}`} onClick={clickTrack(room)} title={canAdd && room.isActive ? 'Click an empty spot to add a showing here' : undefined}>
                          {showings.filter((row) => row.auditorium?._id === room._id).map((row) => (
                            <button
                              type="button"
                              key={row._id}
                              className={`timeline-block ${row.status} ${row.published ? '' : 'unpublished'} ${selectedId === row._id ? 'selected' : ''}`}
                              style={{ ...place(row, hours.from, hours.to), '--movie-color': movieColor(row.movie?._id) }}
                              aria-pressed={selectedId === row._id}
                              aria-label={`${row.movie?.title}, ${room.name}, ${manilaClock(row.startTime)} to ${manilaClock(row.endTime)}, ${row.status}${row.published ? '' : ', hidden from customers'}`}
                              onClick={() => choose(row)}
                            >
                              <b>{row.movie?.title}</b>
                              <small>{manilaClock(row.startTime)}–{manilaClock(row.endTime)}</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="timeline-legend"><span className="key scheduled">Each movie has its own colour</span><span className="key cancelled">Cancelled</span><span className="key hiddenkey">Hidden from customers</span></div>
          </section>

          {showings.length > 0 && (
            <section className="admin-panel" aria-label="Showings list">
              <div className="admin-panel-head"><h2>Showings on this day</h2><span className="admin-count">{showings.length}</span></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th scope="col">Movie</th><th scope="col">Room</th><th scope="col">Time</th><th scope="col">Price</th><th scope="col">Seats left</th><th scope="col">Status</th></tr></thead>
                  <tbody>
                    {showings.map((row) => (
                      <tr key={row._id} className={selectedId === row._id ? 'selected' : ''}>
                        <td><button type="button" className="link-button" onClick={() => choose(row)}>{row.movie?.title}</button></td>
                        <td>{row.auditorium?.name}</td>
                        <td className="mono">{manilaClock(row.startTime)}–{manilaClock(row.endTime)}</td>
                        <td>{pesos(row.ticketPrice)}</td>
                        <td className="mono">{row.remainingSeats} / {row.totalSeats}</td>
                        <td><span className={`admin-status ${row.status}`}>{row.status}</span>{tags(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {panelOpen && (
        <Drawer title={panelTitle} onClose={closePanel}>
          <Feedback error={error} notice="" />
          <form className="show-form" onSubmit={save}>
            <label>Movie
              <select value={draft.movie} onChange={edit('movie')} disabled={locked} required>
                {!publishedMovies.some((movie) => movie._id === draft.movie) && draft.movie && <option value={draft.movie}>{selected?.movie?.title}</option>}
                {publishedMovies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title} ({movie.duration} min){movie.status === 'draft' ? ' · draft' : ''}</option>)}
              </select>
            </label>
            <label>Room
              <select value={draft.auditorium} onChange={edit('auditorium')} disabled={locked} required>
                {!activeRooms.some((room) => room._id === draft.auditorium) && draft.auditorium && <option value={draft.auditorium}>{selected?.auditorium?.name}</option>}
                {activeRooms.map((room) => <option key={room._id} value={room._id}>{room.name} · {room.rows * room.seatsPerRow} seats</option>)}
              </select>
            </label>
            <label>Price per seat (₱)<input type="number" min="0" step="0.01" required value={draft.ticketPrice} onChange={edit('ticketPrice')} disabled={locked} /></label>
            <WhenPicker
              value={draft.startTime}
              onChange={(startTime) => setDraft({ ...draft, startTime })}
              disabled={locked}
              minutes={draftMinutes}
              problem={locked ? '' : clashWarning(draft.startTime, draft.auditorium, draftMinutes, selectedId)}
            />
            {selected && (
              <p className="admin-warning" role="status">
                {selected.status === 'cancelled' ? 'This showing was cancelled and cannot be edited.'
                  : startedOrCancelled ? 'This showing has started and cannot be edited.'
                    : seatsSold(selected) > 0 ? `${seatsSold(selected)} seat${seatsSold(selected) === 1 ? ' is' : 's are'} booked, so the movie, room, time and price are locked. Cancel this showing and add a new one to change them.`
                      : `${selected.remainingSeats} of ${selected.totalSeats} seats free · ${pesos(selected.ticketPrice)} each.`}
              </p>
            )}
            <div className="admin-actions">
              {selected && selected.status === 'scheduled' && !startedOrCancelled && (
                <button type="button" className="btn btn-danger btn-small" disabled={busy} aria-busy={busyAction === 'cancel'} onClick={cancelShowing}>
                  <ActionPending pending={busyAction === 'cancel'}>{busyAction === 'cancel' ? 'Cancelling...' : confirmCancel ? 'Confirm: cancel showing' : 'Cancel showing'}</ActionPending>
                </button>
              )}
              <button type="submit" className="btn btn-primary btn-small" disabled={busy || locked} aria-busy={busyAction === 'save'}>
                <ActionPending pending={busyAction === 'save'}>{busyAction === 'save' ? 'Saving...' : 'Save changes'}</ActionPending>
              </button>
            </div>
          </form>

          {canManage && (
            <div className="editor-extras">
              <form onSubmit={moveShowing} aria-label="Move this showing">
                <h3>Move this showing</h3>
                <p className="profile-help">Works even when tickets are sold. Customers keep their seats and the price they paid and see the new time. A new room must have all the booked seats.</p>
                <label>Room
                  <select value={move.auditorium} onChange={(event) => setMove({ ...move, auditorium: event.target.value })}>
                    {activeRooms.map((room) => <option key={room._id} value={room._id}>{room.name}</option>)}
                  </select>
                </label>
                <WhenPicker
                  value={move.startTime}
                  onChange={(startTime) => setMove({ ...move, startTime })}
                  minutes={draftMinutes}
                  problem={clashWarning(move.startTime, move.auditorium, draftMinutes, selectedId)}
                />
                <div className="admin-actions"><button type="submit" className="btn btn-secondary btn-small" disabled={busy} aria-busy={busyAction === 'move'}><ActionPending pending={busyAction === 'move'}>{busyAction === 'move' ? 'Moving...' : 'Move showing'}</ActionPending></button></div>
              </form>

              <div>
                <h3>Visibility</h3>
                <p className="profile-help">{selected.published ? 'Customers can see and book this showing.' : 'Hidden: customers cannot see or book this showing. Only you can.'}{selected.published && seatsSold(selected) > 0 ? ' It cannot be hidden while customers hold tickets.' : ''}</p>
                <div className="admin-actions"><button type="button" className="btn btn-secondary btn-small" disabled={busy || (selected.published && seatsSold(selected) > 0)} aria-busy={busyAction === 'visibility'} onClick={toggleVisibility}><ActionPending pending={busyAction === 'visibility'}>{busyAction === 'visibility' ? 'Saving...' : selected.published ? 'Hide from customers' : 'Publish to customers'}</ActionPending></button></div>
              </div>

              {selectedRoom && (
                <div>
                  <h3>Blocked seats for this showing</h3>
                  <p className="profile-help">Click seats to block them for this showing only. Seats a customer already holds cannot be blocked. Dark seats are blocked by the room.</p>
                  <SeatGrid rows={selectedRoom.rows} seatsPerRow={selectedRoom.seatsPerRow} selected={blockedDraft} onChange={setBlockedDraft} locked={selectedRoom.blockedSeats || []} disabled={busy} />
                  <div className="admin-actions"><button type="button" className="btn btn-secondary btn-small" disabled={busy} aria-busy={busyAction === 'blocked'} onClick={saveBlocked}><ActionPending pending={busyAction === 'blocked'}>{busyAction === 'blocked' ? 'Saving...' : 'Save blocked seats'}</ActionPending></button></div>
                </div>
              )}
            </div>
          )}
        </Drawer>
      )}

      <AdminBulk
        movies={movies}
        rooms={rooms}
        scheduleFor={scheduleFor}
        open={bulk.open}
        mode={bulk.mode}
        preset={bulk.preset}
        defaultDay={date}
        onModeChange={(mode) => setBulk((current) => ({ ...current, mode }))}
        onClose={() => setBulk((current) => ({ ...current, open: false }))}
        onDone={(message, movieId, day, result) => { setBulk((current) => ({ ...current, open: false })); setScheduleResult(result); setNotice(message); if (movieId) askToPublish(movieId); if (day) { setView('day'); setDate(day); } afterChange(); }}
      />
      {scheduleResult && <ScheduleSuccess result={scheduleResult} movies={movies} rooms={rooms}
        onClose={() => setScheduleResult(null)}
        onAnother={() => { const day = manilaDay(scheduleResult.created[0].startTime); setScheduleResult(null); startAdd({ day }); }}
        onView={() => { const day = manilaDay(scheduleResult.created[0].startTime); setScheduleResult(null); openDay(day); }}
      />}
    </>
  );
}
