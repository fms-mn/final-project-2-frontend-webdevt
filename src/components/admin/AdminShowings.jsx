import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import { describeError, pesos } from '../../utils/adminTools';
import { dayHeading, fromInputValue, manilaClock, minutesOfDay, shiftDay, toInputValue, today } from '../../utils/manila';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';

const seatsSold = (showing) => showing.totalSeats - showing.remainingSeats;

// Where a showing sits on the day's timeline, as percentages of the visible hours.
function place(showing, from, to) {
  const start = minutesOfDay(showing.startTime);
  const length = (new Date(showing.endTime) - new Date(showing.startTime)) / 60000;
  const span = (to - from) * 60;
  const left = Math.max(0, ((start - from * 60) / span) * 100);
  const width = Math.min(100 - left, Math.max(6, (length / span) * 100));
  return { left: `${left}%`, width: `${width}%` };
}

export default function AdminShowings({ movies }) {
  const { busy, busyAction, error, notice, setError, clear, run } = useAdminAction();
  const [date, setDate] = useState(today());
  const [rooms, setRooms] = useState([]);
  const [showings, setShowings] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api('/auditoriums', { signal: controller.signal }),
      api(`/admin/showtimes?date=${date}&limit=200`, { signal: controller.signal }),
    ])
      .then(([roomList, rows]) => {
        setRooms(roomList);
        setShowings(rows.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      })
      .catch((err) => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [date, revision, setError]);

  const selected = showings.find((row) => row._id === selectedId);
  const publishedMovies = useMemo(() => movies.filter((movie) => movie.status === 'published'), [movies]);
  const activeRooms = useMemo(() => rooms.filter((room) => room.isActive), [rooms]);

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

  const startedOrCancelled = selected && (selected.status !== 'scheduled' || new Date(selected.startTime) <= new Date());
  const locked = Boolean(selected && (startedOrCancelled || seatsSold(selected) > 0));

  const choose = (showing) => {
    setAdding(false);
    setSelectedId(showing._id);
    setConfirmCancel(false);
    clear();
    setDraft({
      movie: showing.movie?._id || '',
      auditorium: showing.auditorium?._id || '',
      startTime: toInputValue(showing.startTime),
      ticketPrice: String(showing.ticketPrice / 100),
    });
  };

  const startAdd = () => {
    setAdding(true);
    setSelectedId('');
    setConfirmCancel(false);
    clear();
    setDraft({ movie: publishedMovies[0]?._id || '', auditorium: activeRooms[0]?._id || '', startTime: `${date}T16:00`, ticketPrice: '400' });
  };

  const goToDay = (day) => {
    if (!day) return;
    setDate(day);
    setSelectedId('');
    setAdding(false);
    setDraft(null);
    clear();
  };
  const changeDay = (offset) => goToDay(shiftDay(date, offset));

  const save = async (event) => {
    event.preventDefault();
    const startTime = fromInputValue(draft.startTime);
    if (!startTime) { setError('Choose a start date and time.'); return; }
    const body = { movie: draft.movie, auditorium: draft.auditorium, startTime, ticketPrice: Math.round(Number(draft.ticketPrice) * 100) };
    const done = await run(
      () => (adding ? api('/showtimes', { method: 'POST', body }) : api(`/showtimes/${selectedId}`, { method: 'PATCH', body })),
      adding ? 'Showing added' : 'Showing updated', 'save',
    );
    if (done) { setAdding(false); setSelectedId(''); setDraft(null); setRevision((value) => value + 1); }
  };

  const cancelShowing = async () => {
    if (!confirmCancel) { setConfirmCancel(true); return; }
    const done = await run(() => api(`/showtimes/${selectedId}/cancel`, { method: 'PATCH' }), 'Showing cancelled. Its bookings were cancelled and the seats freed', 'cancel');
    if (done) { setConfirmCancel(false); setSelectedId(''); setDraft(null); setRevision((value) => value + 1); }
  };

  const edit = (field) => (event) => setDraft({ ...draft, [field]: event.target.value });
  const editorTitle = adding ? 'Add showing' : selected ? selected.movie?.title : 'Choose a showing';

  return (
    <>
      <Feedback error={error} notice={notice} />
      <div className="showings-layout">
        <section className="admin-panel" aria-label="Schedule">
          <div className="admin-panel-head">
            <h2>{dayHeading(date)}</h2>
            <div className="admin-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => changeDay(-1)}>← Day</button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => goToDay(today())} disabled={date === today()}>Today</button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => changeDay(1)}>Day →</button>
              <input type="date" aria-label="Go to date" value={date} onChange={(event) => goToDay(event.target.value)} />
            </div>
          </div>
          {rooms.length === 0 ? <p>No rooms yet. Add one in the Rooms tab first.</p> : (
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
                    <div className="timeline-track">
                      {showings.filter((row) => row.auditorium?._id === room._id).map((row) => (
                        <button
                          type="button"
                          key={row._id}
                          className={`timeline-block ${row.status} ${selectedId === row._id ? 'selected' : ''}`}
                          style={place(row, hours.from, hours.to)}
                          aria-pressed={selectedId === row._id}
                          aria-label={`${row.movie?.title}, ${room.name}, ${manilaClock(row.startTime)} to ${manilaClock(row.endTime)}, ${row.status}`}
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
          )}
          <div className="timeline-legend"><span className="key scheduled">Scheduled</span><span className="key selected">Selected</span><span className="key cancelled">Cancelled</span></div>
        </section>

        <section className="admin-panel admin-form" aria-label="Showing details">
          <span className="home-section-eyebrow">{adding ? 'New showing' : 'Selected showing'}</span>
          <h2>{editorTitle}</h2>
          {!draft && <p>Pick a showing on the timeline or in the list, or add a new one.</p>}
          {draft && (
            <form onSubmit={save}>
              <label>Movie
                <select value={draft.movie} onChange={edit('movie')} disabled={locked} required>
                  {!publishedMovies.some((movie) => movie._id === draft.movie) && draft.movie && <option value={draft.movie}>{selected?.movie?.title}</option>}
                  {publishedMovies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title} ({movie.duration} min)</option>)}
                </select>
              </label>
              <label>Room
                <select value={draft.auditorium} onChange={edit('auditorium')} disabled={locked} required>
                  {!activeRooms.some((room) => room._id === draft.auditorium) && draft.auditorium && <option value={draft.auditorium}>{selected?.auditorium?.name}</option>}
                  {activeRooms.map((room) => <option key={room._id} value={room._id}>{room.name} · {room.rows * room.seatsPerRow} seats</option>)}
                </select>
              </label>
              <div className="admin-pair">
                <label>Start (Manila time)<input type="datetime-local" required value={draft.startTime} onChange={edit('startTime')} disabled={locked} /></label>
                <label>Price per seat (₱)<input type="number" min="0" step="0.01" required value={draft.ticketPrice} onChange={edit('ticketPrice')} disabled={locked} /></label>
              </div>
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
                  <ActionPending pending={busyAction === 'save'}>{busyAction === 'save' ? 'Saving...' : adding ? 'Add showing' : 'Save changes'}</ActionPending>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      <section className="admin-panel" aria-label="Showings list">
        <div className="admin-panel-head">
          <h2>Showings on this day</h2>
          <button type="button" className="btn btn-primary btn-small" onClick={startAdd} disabled={publishedMovies.length === 0 || activeRooms.length === 0}>Add showing</button>
        </div>
        {(publishedMovies.length === 0 || activeRooms.length === 0) && <p className="profile-help">To add a showing you need at least one published movie and one active room.</p>}
        {showings.length === 0 ? <p>No showings on this day.</p> : (
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
                    <td><span className={`admin-status ${row.status}`}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
