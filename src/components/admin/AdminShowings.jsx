import { useEffect, useMemo, useRef, useState } from 'react';
import { api, apiAll } from '../../api';
import ActionPending from '../ActionPending';
import DatePicker from '../DatePicker';
import { dateProblem } from '../../utils/calendar';
import { describeError, pesos } from '../../utils/adminTools';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { dayHeading, displayClock, fromInputValue, manilaClock, manilaDay, minutesOfDay, shiftDay, shortDate, toInputValue, today } from '../../utils/manila';
import { findClash } from '../../utils/clashes';
import { movieColor, timeAtFraction, weekDays, weekLabel, weekStart } from '../../utils/schedule';
import { attentionItems, dayFacts, fractionOfDay, seatsSold, showingState } from '../../utils/showingsOverview';
import AdminBulk from './AdminBulk';
import ScheduleSuccess from './ScheduleSuccess';
import ConfirmDialog from './ConfirmDialog';
import Drawer from './Drawer';
import WhenPicker from './WhenPicker';
import Feedback from './Feedback';
import SeatGrid from './SeatGrid';
import useAdminAction from './useAdminAction';
import './adminShowings.css';

const byStart = (a, b) => new Date(a.startTime) - new Date(b.startTime);
const weekdayShort = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' });
const dayOfMonth = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric' });
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Where a showing sits on the day's timeline, as percentages of the visible hours.
function place(showing, from, to) {
  const start = minutesOfDay(showing.startTime);
  const length = (new Date(showing.endTime) - new Date(showing.startTime)) / 60000;
  const span = (to - from) * 60;
  const left = Math.max(0, ((start - from * 60) / span) * 100);
  const width = Math.min(100 - left, Math.max(6, (length / span) * 100));
  return { left: `${left}%`, width: `${width}%` };
}

// One line in a showing's panel: what it does, and in small words what happens when you press it.
function ActionRow({ title, hint, tone = '', open, disabled, busy, onClick }) {
  return (
    <button type="button" className={`show-action${tone ? ` ${tone}` : ''}${open ? ' is-open' : ''}`} disabled={disabled} aria-expanded={open === undefined ? undefined : open} aria-busy={busy || undefined} onClick={onClick}>
      <b>{busy ? 'Saving...' : title}</b>
      <small>{hint}</small>
    </button>
  );
}

export default function AdminShowings({ movies, scheduleFor, focusShowing, onScheduleHandled, onShowingHandled, reloadMovies }) {
  const { busy, busyAction, error, notice, setError, setNotice, clear, run } = useAdminAction();
  const [date, setDate] = useState(today());
  const [rooms, setRooms] = useState([]);
  const [byDay, setByDay] = useState({}); // { 'YYYY-MM-DD': showings } for the days on screen
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelledNotice, setCancelledNotice] = useState(false);
  const [revision, setRevision] = useState(0);
  const [move, setMove] = useState({ startTime: '', auditorium: '' });
  const [blockedDraft, setBlockedDraft] = useState([]);
  const [bulk, setBulk] = useState(() => ({ open: Boolean(scheduleFor), mode: 'many', preset: scheduleFor ? { span: 'many', movieId: scheduleFor.movieId } : null }));
  const [scheduleResult, setScheduleResult] = useState(null);
  const [movieFilter, setMovieFilter] = useState(''); // '' shows every movie, otherwise one movie's id
  const [activeAction, setActiveAction] = useState(''); // which part of the showing panel is open: edit, move or seats
  const [ghost, setGhost] = useState(null); // the "+ time" marker under the mouse on a room's row
  const detailRef = useRef(null);
  const [gapMinutes, setGapMinutes] = useState(15); // the cinema's gap between shows
  const [otherDays, setOtherDays] = useState({}); // showings of days picked in a form that are not on screen

  // Every change to the schedule changes the showing counts the Movies screen shows, so refresh them.
  const firstRevision = useRef(true);
  useEffect(() => {
    if (firstRevision.current) { firstRevision.current = false; return; }
    reloadMovies?.();
  }, [revision]); // eslint-disable-line react-hooks/exhaustive-deps

  // The strip always shows the whole week; moving between its days does not reload anything.
  const firstOfWeek = weekStart(date);
  const visibleDays = useMemo(() => weekDays(firstOfWeek), [firstOfWeek]);

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
    if (!scheduleFor) return;
    setBulk({ open: true, mode: 'many', preset: { span: 'many', movieId: scheduleFor.movieId } });
    onScheduleHandled?.();
  }, [scheduleFor, onScheduleHandled]);

  // Arriving from a movie's panel: go to that showing's day, then open it.
  const [pendingId, setPendingId] = useState('');
  useEffect(() => {
    if (!focusShowing) return;
    setDate(focusShowing.day);
    setPendingId(focusShowing.id);
    onShowingHandled?.();
  }, [focusShowing, onShowingHandled]);

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

  const closePanel = () => { setSelectedId(''); setDraft(null); setConfirmCancel(false); setActiveAction(''); clear(); };

  const choose = (showing) => {
    setSelectedId(showing._id);
    setConfirmCancel(false);
    setActiveAction('');
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

  // One place to add showings. Clicking an empty spot on a room's row starts it for that day, room
  // and time; the button and the "Add showings" links start it for several days, for the movie
  // being filtered on or the one named.
  const startAdd = ({ day = date, time, room } = {}) => {
    clear();
    setBulk({ open: true, mode: 'many', preset: { span: 'one', day, time, room, movieId: movieFilter || undefined, stamp: Date.now() } });
  };
  const startPlanner = ({ movie } = {}) => {
    clear();
    setBulk({ open: true, mode: 'many', preset: { span: 'many', movieId: movie || movieFilter || undefined, stamp: Date.now() } });
  };

  const goToDay = (day) => {
    if (!day) return;
    setDate(day);
    closePanel();
  };
  const step = (direction) => goToDay(shiftDay(date, direction * 7));

  const save = async (event) => {
    event.preventDefault();
    const dateError = dateProblem(draft.startTime?.split('T')[0], { min: today(), required: true });
    if (dateError) { setError(dateError); return; }
    const startTime = fromInputValue(draft.startTime);
    if (!startTime) { setError('Choose a start date and time.'); return; }
    if (Date.parse(startTime) <= Date.now()) { setError('That showing time has already passed. Choose a later time or another day.'); return; }
    const body = { movie: draft.movie, auditorium: draft.auditorium, startTime, ticketPrice: Math.round(Number(draft.ticketPrice) * 100) };
    const done = await run(() => api(`/showtimes/${selectedId}`, { method: 'PATCH', body }), 'Showing updated', 'save');
    if (done) { setSelectedId(''); setDraft(null); setRevision((value) => value + 1); }
  };

  const cancelShowing = async () => {
    const done = await run(() => api(`/showtimes/${selectedId}/cancel`, { method: 'PATCH' }), '', 'cancel');
    if (done) { setConfirmCancel(false); setSelectedId(''); setDraft(null); setCancelledNotice(true); setRevision((value) => value + 1); }
  };

  const afterChange = () => setRevision((value) => value + 1);

  // A draft movie with showings is invisible to customers: the "needs attention" list offers to publish it.
  const publishDraft = async (movie) => {
    const done = await run(() => api(`/admin/movies/${movie._id}`, { method: 'PATCH', body: { status: 'published' } }), `"${movie.title}" is published. Its showings are now on sale.`, `publish:${movie._id}`);
    if (done) reloadMovies?.();
  };

  const moveShowing = async (event) => {
    event.preventDefault();
    const dateError = dateProblem(move.startTime?.split('T')[0], { min: today(), required: true });
    if (dateError) { setError(dateError); return; }
    const startTime = fromInputValue(move.startTime);
    if (!startTime) { setError('Choose the new start date and time.'); return; }
    if (Date.parse(startTime) <= Date.now()) { setError('That showing time has already passed. Choose a later time or another day.'); return; }
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

  // The dashed "+ 3:30 PM" marker that follows the mouse over an empty part of a room's row.
  const hoverTrack = (room) => (event) => {
    if (event.target !== event.currentTarget) { setGhost(null); return; }
    const box = event.currentTarget.getBoundingClientRect();
    const time = timeAtFraction((event.clientX - box.left) / box.width, hours.from, hours.to);
    const left = Math.max(0, Math.min(100, fractionOfDay(time, hours.from, hours.to) * 100));
    setGhost((current) => (current && current.room === room._id && current.time === time ? current : { room: room._id, time, left }));
  };

  // Opening a showing brings its panel into view and moves keyboard focus to it.
  useEffect(() => {
    if (!selectedId) return;
    const panel = detailRef.current;
    if (!panel) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'nearest' });
    panel.querySelector('#show-detail-title')?.focus({ preventScroll: true });
  }, [selectedId]);

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

  const panelOpen = Boolean(selected && draft);

  const attention = attentionItems(movies);
  const moviesThisWeek = useMemo(() => {
    const seen = new Map();
    for (const row of everything) if (row.status === 'scheduled' && row.movie?._id && !seen.has(row.movie._id)) seen.set(row.movie._id, { id: row.movie._id, title: row.movie.title });
    return [...seen.values()];
  }, [everything]);
  const scheduledToday = showings.filter((row) => row.status === 'scheduled').length;
  const selectedMovieStatus = selected && movies.find((movie) => movie._id === selected.movie?._id)?.status;
  const selectedState = selected ? showingState(selected, { movieStatus: selectedMovieStatus }) : '';
  const stateLabel = { 'on-sale': 'On sale', hidden: 'Hidden', cancelled: 'Cancelled', started: 'Started' };
  const sold = selected ? seatsSold(selected) : 0;

  return (
    <>
      <div className="admin-panel show-toolbar">
        <div className="show-toolbar-nav">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => step(-1)} aria-label="Previous week">← Week</button>
          <h2 className="show-toolbar-title">{weekLabel(date)}</h2>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => step(1)} aria-label="Next week">Week →</button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => goToDay(today())} disabled={date === today()}>Today</button>
          <DatePicker label="Go to date" required value={date} onChange={goToDay} />
        </div>
        <div className="show-toolbar-actions">
          <button type="button" className="btn btn-primary" onClick={() => startPlanner()} disabled={!canAdd}>+ Add showings</button>
        </div>
      </div>
      {!canAdd && <p className="admin-warning">To add a showing you need at least one movie (a draft is fine) and one active room. Add a movie in Movies, or a room in Rooms.</p>}

      {attention.length > 0 && (
        <section className="show-attention" aria-label="Needs attention">
          {attention.slice(0, 3).map((item) => (
            <div className="show-attention-item" key={`${item.kind}:${item.movie._id}`}>
              <FiAlertTriangle aria-hidden="true" />
              <p>
                {item.kind === 'draft'
                  ? <><b>{item.movie.title}</b> has {plural(item.count, 'showing')} but is still a draft, so customers can&apos;t see {item.count === 1 ? 'it' : 'them'}.</>
                  : <><b>{item.movie.title}</b> is released but has nothing to book, so customers see &quot;No showings&quot;.</>}
              </p>
              {item.kind === 'draft'
                ? <button type="button" className="btn btn-primary btn-small" disabled={busy} aria-busy={busyAction === `publish:${item.movie._id}`} onClick={() => publishDraft(item.movie)}>{busyAction === `publish:${item.movie._id}` ? 'Publishing...' : 'Publish it'}</button>
                : <button type="button" className="btn btn-secondary btn-small" onClick={() => startPlanner({ movie: item.movie._id })} disabled={!canAdd}>Add showings</button>}
            </div>
          ))}
          {attention.length > 3 && <p className="show-attention-more">and {attention.length - 3} more in Movies</p>}
        </section>
      )}

      <Feedback error={panelOpen ? '' : error} notice={notice} />

      {moviesThisWeek.length > 1 && (
        <div className="status-chips" role="group" aria-label="Show one movie">
          <button type="button" className={`filter-btn${movieFilter === '' ? ' active' : ''}`} aria-pressed={movieFilter === ''} onClick={() => setMovieFilter('')}>All movies</button>
          {moviesThisWeek.map((item) => (
            <button type="button" key={item.id} className={`filter-btn${movieFilter === item.id ? ' active' : ''}`} aria-pressed={movieFilter === item.id} onClick={() => setMovieFilter(movieFilter === item.id ? '' : item.id)}>
              <span className="show-dot" style={{ background: movieColor(item.id) }} aria-hidden="true" />{item.title}
            </button>
          ))}
        </div>
      )}

      <nav className="show-days" aria-label="Days of the week">
        {visibleDays.map((day) => {
          const loaded = Boolean(byDay[day]);
          const facts = dayFacts(byDay[day] || []);
          return (
            <button
              type="button"
              key={day}
              className={`show-day${day === date ? ' on' : ''}${day === today() ? ' today' : ''}`}
              aria-pressed={day === date}
              aria-label={`${dayHeading(day)}: ${loaded ? `${plural(facts.scheduled, 'showing')}${facts.hidden ? `, ${facts.hidden} hidden` : ''}` : 'loading'}`}
              onClick={() => goToDay(day)}
            >
              <span>{weekdayShort(day).toUpperCase()}</span>
              <b>{dayOfMonth(day)}</b>
              <small>{!loaded ? '…' : facts.scheduled === 0 ? 'No shows' : plural(facts.scheduled, 'show')}{loaded && facts.hidden > 0 && <em>{facts.hidden} hidden</em>}</small>
            </button>
          );
        })}
      </nav>

      <section className="admin-panel" aria-label="Schedule">
        <div className="admin-panel-head"><h2>{dayHeading(date)}</h2><span className="admin-count">{plural(scheduledToday, 'showing')}</span></div>
        {rooms.length === 0 ? <p>No rooms yet. Add one in the Rooms tab first.</p> : (
          <>
            {showings.length === 0 && <p className="show-empty">Nothing on this day yet. Click an empty spot on a room&apos;s row to add a showing at that time, or press <b>+ Add showings</b>.</p>}
            <div className="timeline-scroll">
              <div className="timeline">
                <div className="timeline-row timeline-hours" aria-hidden="true">
                  <span />
                  <div className="timeline-track plain">
                    {hours.marks.map((hour) => (
                      <span key={hour} className="mono" style={{ left: `${((hour - hours.from) / (hours.to - hours.from)) * 100}%` }}>{displayClock(`${String(hour).padStart(2, '0')}:00`).replace(':00', '')}</span>
                    ))}
                  </div>
                </div>
                {rooms.map((room) => {
                  const clickable = canAdd && room.isActive;
                  const ghostHere = ghost && ghost.room === room._id ? ghost : null;
                  return (
                    <div className="timeline-row" key={room._id}>
                      <strong>{room.name}{room.isActive ? '' : ' (inactive)'}<small>{room.rows * room.seatsPerRow} seats</small></strong>
                      <div
                        className={`timeline-track${clickable ? ' clickable' : ''}`}
                        onClick={clickTrack(room)}
                        onMouseMove={clickable ? hoverTrack(room) : undefined}
                        onMouseLeave={() => setGhost(null)}
                        title={clickable ? 'Click an empty spot to add a showing here' : undefined}
                      >
                        {ghostHere && <span className={`timeline-ghost${ghostHere.left > 80 ? ' flip' : ''}`} style={{ left: `${ghostHere.left}%` }} aria-hidden="true">+ {displayClock(ghostHere.time)}</span>}
                        {showings.filter((row) => row.auditorium?._id === room._id).map((row) => {
                          const state = showingState(row, { movieStatus: movies.find((movie) => movie._id === row.movie?._id)?.status });
                          return (
                            <button
                              type="button"
                              key={row._id}
                              className={`timeline-block ${row.status} ${state === 'hidden' ? 'unpublished' : ''} ${selectedId === row._id ? 'selected' : ''}${movieFilter && row.movie?._id !== movieFilter ? ' dim' : ''}`}
                              style={{ ...place(row, hours.from, hours.to), '--movie-color': movieColor(row.movie?._id) }}
                              aria-pressed={selectedId === row._id}
                              aria-label={`${row.movie?.title}, ${room.name}, ${manilaClock(row.startTime)} to ${manilaClock(row.endTime)}, ${stateLabel[state].toLowerCase()}${row.status === 'scheduled' ? `, ${seatsSold(row)} of ${row.totalSeats} seats sold` : ''}`}
                              onClick={() => choose(row)}
                            >
                              <b>{row.movie?.title}</b>
                              <small>{displayClock(manilaClock(row.startTime)).replace(' ', '')}{state === 'hidden' ? ' · hidden' : ''}</small>
                              {row.status === 'scheduled' && row.totalSeats > 0 && <i className="timeline-fill" style={{ width: `${(seatsSold(row) / row.totalSeats) * 100}%` }} aria-hidden="true" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        <div className="timeline-legend">
          <span className="key scheduled">Colour = movie, bar = seats sold</span>
          <span className="key hiddenkey">Hidden from customers</span>
          <span className="key cancelled">Cancelled</span>
        </div>
      </section>

      {panelOpen && (
        <section className="admin-panel show-detail" aria-labelledby="show-detail-title" ref={detailRef} onKeyDown={(event) => { if (event.key === 'Escape') closePanel(); }}>
          <div className="show-detail-head">
            <h2 id="show-detail-title" tabIndex={-1}><span className="show-dot" style={{ background: movieColor(selected.movie?._id) }} aria-hidden="true" />{selected.movie?.title}</h2>
            <span className={`show-state ${selectedState}`}>{stateLabel[selectedState]}</span>
            <button type="button" className="show-detail-close" onClick={closePanel} aria-label="Close this panel"><FiX aria-hidden="true" /></button>
          </div>
          <dl className="show-facts">
            <div><dt>When</dt><dd>{dayHeading(manilaDay(selected.startTime))}<br />{displayClock(manilaClock(selected.startTime))} to {displayClock(manilaClock(selected.endTime))}</dd></div>
            <div><dt>Room</dt><dd>{selected.auditorium?.name}</dd></div>
            <div><dt>Seats sold</dt><dd>{sold} of {selected.totalSeats}</dd></div>
            <div><dt>Price</dt><dd>{pesos(selected.ticketPrice)}</dd></div>
          </dl>
          <Feedback error={error} notice="" />
          {selectedState === 'cancelled' && <p className="admin-warning" role="status">This showing was cancelled. Its bookings were cancelled and the seats freed.</p>}
          {selectedState === 'started' && <p className="admin-warning" role="status">This showing has started, so it can no longer be changed.</p>}
          {selectedMovieStatus === 'draft' && selectedState !== 'cancelled' && selectedState !== 'started' && <p className="admin-warning" role="status">{selected.movie?.title} is still a draft, so customers can&apos;t see this showing yet. Publish the movie to put it on sale.</p>}

          {canManage && (
            <div className="show-actions">
              <ActionRow title="Move to another time or room" hint={sold > 0 ? 'Customers keep their seats and the price they paid' : 'No bookings yet'} open={activeAction === 'move'} onClick={() => setActiveAction(activeAction === 'move' ? '' : 'move')} />
              {activeAction === 'move' && (
                <form className="show-sub" onSubmit={moveShowing} aria-label="Move this showing">
                  <label>Room
                    <select value={move.auditorium} onChange={(event) => setMove({ ...move, auditorium: event.target.value })}>
                      {activeRooms.map((room) => <option key={room._id} value={room._id}>{room.name}</option>)}
                    </select>
                  </label>
                  <WhenPicker value={move.startTime} onChange={(startTime) => setMove({ ...move, startTime })} minutes={draftMinutes} problem={clashWarning(move.startTime, move.auditorium, draftMinutes, selectedId)} />
                  <p className="profile-help">A new room must have all the booked seats.</p>
                  <div className="admin-actions"><button type="submit" className="btn btn-primary btn-small" disabled={busy} aria-busy={busyAction === 'move'}><ActionPending pending={busyAction === 'move'}>{busyAction === 'move' ? 'Moving...' : 'Move showing'}</ActionPending></button></div>
                </form>
              )}

              <ActionRow
                title={selected.published ? 'Hide from customers' : 'Show to customers'}
                hint={selected.published ? (sold > 0 ? 'Not possible while customers hold tickets' : 'Existing bookings stay valid') : 'Puts it on sale'}
                disabled={busy || (selected.published && sold > 0)}
                busy={busyAction === 'visibility'}
                onClick={toggleVisibility}
              />

              <ActionRow title="Block seats" hint="For this showing only" open={activeAction === 'seats'} onClick={() => setActiveAction(activeAction === 'seats' ? '' : 'seats')} />
              {activeAction === 'seats' && selectedRoom && (
                <div className="show-sub">
                  <p className="profile-help">Click seats to block them for this showing only. Seats a customer already holds cannot be blocked. Dark seats are blocked by the room.</p>
                  <SeatGrid rows={selectedRoom.rows} seatsPerRow={selectedRoom.seatsPerRow} selected={blockedDraft} onChange={setBlockedDraft} locked={selectedRoom.blockedSeats || []} disabled={busy} />
                  <div className="admin-actions"><button type="button" className="btn btn-primary btn-small" disabled={busy} aria-busy={busyAction === 'blocked'} onClick={saveBlocked}><ActionPending pending={busyAction === 'blocked'}>{busyAction === 'blocked' ? 'Saving...' : 'Save blocked seats'}</ActionPending></button></div>
                </div>
              )}

              <ActionRow title="Change movie, room or price" hint={locked ? 'Locked while seats are booked. Cancel and add a new showing instead' : 'Only possible before anyone books'} disabled={locked} open={activeAction === 'edit'} onClick={() => setActiveAction(activeAction === 'edit' ? '' : 'edit')} />
              {activeAction === 'edit' && !locked && (
                <form className="show-sub show-form" onSubmit={save}>
                  <label>Movie
                    <select value={draft.movie} onChange={edit('movie')} required>
                      {!publishedMovies.some((movie) => movie._id === draft.movie) && draft.movie && <option value={draft.movie}>{selected?.movie?.title}</option>}
                      {publishedMovies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title} ({movie.duration} min){movie.status === 'draft' ? ' · draft' : ''}</option>)}
                    </select>
                  </label>
                  <label>Room
                    <select value={draft.auditorium} onChange={edit('auditorium')} required>
                      {!activeRooms.some((room) => room._id === draft.auditorium) && draft.auditorium && <option value={draft.auditorium}>{selected?.auditorium?.name}</option>}
                      {activeRooms.map((room) => <option key={room._id} value={room._id}>{room.name} · {room.rows * room.seatsPerRow} seats</option>)}
                    </select>
                  </label>
                  <label>Price per seat (₱)<input type="number" min="0" step="0.01" required value={draft.ticketPrice} onChange={edit('ticketPrice')} /></label>
                  <WhenPicker value={draft.startTime} onChange={(startTime) => setDraft({ ...draft, startTime })} minutes={draftMinutes} problem={clashWarning(draft.startTime, draft.auditorium, draftMinutes, selectedId)} />
                  <div className="admin-actions"><button type="submit" className="btn btn-primary btn-small" disabled={busy} aria-busy={busyAction === 'save'}><ActionPending pending={busyAction === 'save'}>{busyAction === 'save' ? 'Saving...' : 'Save changes'}</ActionPending></button></div>
                </form>
              )}

              <ActionRow
                tone="danger"
                title="Cancel showing"
                hint={sold > 0 ? `${plural(sold, 'seat')} booked. Those bookings are cancelled and refunded` : 'Nothing booked yet'}
                open={confirmCancel}
                onClick={() => { setActiveAction(''); setConfirmCancel(!confirmCancel); }}
              />
              {confirmCancel && (
                <div className="show-sub show-confirm" role="alertdialog" aria-label="Confirm cancelling this showing">
                  <p>Cancel <b>{selected.movie?.title}</b> on {dayHeading(manilaDay(selected.startTime))} at {displayClock(manilaClock(selected.startTime))}? {sold > 0 ? `${plural(sold, 'booked seat')} will be cancelled and refunded, and customers are emailed.` : 'Nobody has booked it.'} This cannot be undone.</p>
                  <div className="admin-actions">
                    <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={() => setConfirmCancel(false)}>Keep showing</button>
                    <button type="button" className="btn btn-danger btn-small" disabled={busy} aria-busy={busyAction === 'cancel'} onClick={cancelShowing}><ActionPending pending={busyAction === 'cancel'}>{busyAction === 'cancel' ? 'Cancelling...' : 'Yes, cancel showing'}</ActionPending></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

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

      {bulk.open && <AdminBulk
        movies={movies}
        rooms={rooms}
        open={bulk.open}
        mode={bulk.mode}
        preset={bulk.preset}
        defaultDay={date}
        gapMinutes={gapMinutes}
        onModeChange={(mode) => setBulk((current) => ({ ...current, mode }))}
        onClose={() => setBulk((current) => ({ ...current, open: false }))}
        onDone={(message, movieId, day, result) => { setBulk((current) => ({ ...current, open: false })); setScheduleResult(result); setNotice(message); if (day) setDate(day); afterChange(); }}
      />}
      {cancelledNotice && <ConfirmDialog title="Showing cancelled" tone="info" cancelLabel="OK" onClose={() => setCancelledNotice(false)}>
        <p>Bookings were cancelled and the seats released.</p>
      </ConfirmDialog>}
      {scheduleResult && <ScheduleSuccess result={scheduleResult} movies={movies} rooms={rooms}
        onClose={() => setScheduleResult(null)}
        onAnother={() => { const day = manilaDay(scheduleResult.created[0].startTime); setScheduleResult(null); startAdd({ day }); }}
        onView={() => { const day = manilaDay(scheduleResult.created[0].startTime); setScheduleResult(null); goToDay(day); }}
      />}
    </>
  );
}
