import { useMemo, useState } from 'react';
import { FiCalendar, FiClock, FiEdit2, FiFilm, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import { todayInputValue } from '../../data/demoAdminOperations';

const blankShowtime = (movies, cinemas) => ({
  movieId: movies[0]?._id || '', cinemaId: cinemas[0]?.id || '', date: todayInputValue(),
  startTime: '10:00', price: 280, bookedSeats: 0,
});
const minutes = (time) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; };
const displayTime = (time) => new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${time}:00`));

export default function AdminShowtimes({ movies, cinemas, showtimes, setShowtimes }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [cinemaFilter, setCinemaFilter] = useState('all');
  const filtered = useMemo(() => showtimes
    .filter((show) => (!dateFilter || show.date === dateFilter) && (cinemaFilter === 'all' || show.cinemaId === cinemaFilter))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [showtimes, dateFilter, cinemaFilter]);

  const movieFor = (id) => movies.find((movie) => movie._id === id);
  const cinemaFor = (id) => cinemas.find((cinema) => cinema.id === id);
  const availableSeats = (show) => {
    const room = cinemaFor(show.cinemaId);
    if (!room) return 0;
    return Math.max(0, room.rows * room.seatsPerRow - Object.keys(room.seatStates).length - show.bookedSeats);
  };
  const openAdd = () => { setDraft(blankShowtime(movies, cinemas)); setError(''); setNotice(''); setDeleteId(''); };
  const openEdit = (show) => { setDraft({ ...show }); setError(''); setNotice(''); setDeleteId(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const save = (event) => {
    event.preventDefault();
    const movie = movieFor(draft.movieId);
    if (!movie || !cinemaFor(draft.cinemaId)) { setError('Choose a movie and cinema room.'); return; }
    const start = minutes(draft.startTime);
    const end = start + Number(movie.duration || 120);
    if (end > 1440) { setError('This screening would end after midnight. Choose an earlier start time.'); return; }
    const collision = showtimes.find((show) => {
      if (show.id === draft.id || show.cinemaId !== draft.cinemaId || show.date !== draft.date) return false;
      const existingMovie = movieFor(show.movieId);
      const existingStart = minutes(show.startTime);
      const existingEnd = existingStart + Number(existingMovie?.duration || 120);
      return start < existingEnd && end > existingStart;
    });
    if (collision) {
      const conflictingMovie = movieFor(collision.movieId);
      setError(`Schedule overlaps with ${conflictingMovie?.title || 'another movie'} at ${displayTime(collision.startTime)}.`);
      return;
    }
    const saved = { ...draft, price: Number(draft.price), bookedSeats: Number(draft.bookedSeats || 0) };
    if (saved.id) {
      setShowtimes((items) => items.map((show) => show.id === saved.id ? saved : show));
      setNotice('Screening schedule updated.');
    } else {
      saved.id = `show-${Date.now()}`;
      setShowtimes((items) => [...items, saved]);
      setNotice('Screening schedule added.');
    }
    setDraft(null); setError('');
  };
  const remove = (show) => {
    if (deleteId !== show.id) { setDeleteId(show.id); return; }
    setShowtimes((items) => items.filter((item) => item.id !== show.id));
    setDeleteId(''); setNotice('Screening schedule deleted.');
  };

  return <>
    {draft && <form className="admin-panel showtime-editor" onSubmit={save}>
      <div className="admin-card-heading"><div><span className="home-section-eyebrow">{draft.id ? 'EDIT SCREENING' : 'ADD SCREENING'}</span><h2>{draft.id ? 'Update screening schedule' : 'Schedule a movie'}</h2></div><button type="button" className="icon-button" aria-label="Close showtime form" onClick={() => setDraft(null)}><FiX /></button></div>
      {error && <div className="error-message" role="alert">{error}</div>}
      <div className="showtime-form-grid">
        <label>Movie<select required value={draft.movieId} onChange={(event) => setDraft({ ...draft, movieId: event.target.value })}>{movies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title} ({movie.duration} min)</option>)}</select></label>
        <label>Cinema room<select required value={draft.cinemaId} onChange={(event) => setDraft({ ...draft, cinemaId: event.target.value })}>{cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}</select></label>
        <label>Screening date<input required type="date" min={todayInputValue()} value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
        <label>Start time<input required type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label>
        <label>Ticket price (PHP)<input required type="number" min="0" step="10" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label>
        <div className="showtime-form-actions"><button type="button" className="btn btn-secondary btn-small" onClick={() => setDraft(null)}>Cancel</button><button type="submit" className="btn btn-primary btn-small">{draft.id ? 'Save schedule' : 'Add screening'}</button></div>
      </div>
    </form>}

    <section className="admin-panel showtime-management">
      <div className="admin-card-heading"><div><span className="home-section-eyebrow">SHOWTIME MANAGEMENT</span><h2>Screening schedules</h2><p>{showtimes.length} screenings scheduled</p></div><button type="button" className="btn btn-primary btn-small" onClick={openAdd} disabled={!movies.length || !cinemas.length}><FiPlus /> Add screening</button></div>
      {notice && <div className="admin-notice" role="status">{notice}</div>}
      <div className="showtime-filters"><label>Date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label><label>Cinema<select value={cinemaFilter} onChange={(event) => setCinemaFilter(event.target.value)}><option value="all">All cinemas</option>{cinemas.map((cinema) => <option value={cinema.id} key={cinema.id}>{cinema.name}</option>)}</select></label><button type="button" onClick={() => { setDateFilter(''); setCinemaFilter('all'); }}>Clear filters</button></div>
      <div className="showtime-list">{filtered.map((show) => {
        const movie = movieFor(show.movieId); const cinema = cinemaFor(show.cinemaId); const available = availableSeats(show);
        return <article className="showtime-row" key={show.id}>
          <div className="showtime-date"><FiCalendar /><strong>{new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(`${show.date}T00:00:00`))}</strong><span>{displayTime(show.startTime)}</span></div>
          <div className="showtime-movie"><strong>{movie?.title || 'Unknown movie'}</strong><span><FiFilm /> {cinema?.name || 'Unknown cinema'} · {movie?.duration || 120} min</span></div>
          <div className="showtime-price"><strong>₱{show.price.toLocaleString()}</strong><span>per ticket</span></div>
          <div className="showtime-seats"><strong>{available}</strong><span>seats available</span></div>
          <div className="showtime-actions"><button type="button" className="icon-button" aria-label="Edit screening" onClick={() => openEdit(show)}><FiEdit2 /></button><button type="button" className={`icon-button ${deleteId === show.id ? 'confirm-delete' : ''}`} aria-label={deleteId === show.id ? 'Confirm delete screening' : 'Delete screening'} onClick={() => remove(show)}><FiTrash2 /></button>{deleteId === show.id && <button type="button" className="movie-delete-cancel" onClick={() => setDeleteId('')}>Cancel</button>}</div>
        </article>;
      })}</div>
      {!filtered.length && <div className="admin-empty"><FiClock /><strong>No screenings found</strong><span>Change the filters or add a screening.</span></div>}
      <p className="admin-local-note">Schedules and availability are frontend-only and reset when the page is refreshed.</p>
    </section>
  </>;
}
