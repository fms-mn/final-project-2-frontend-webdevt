import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { listAuditoriums, listShowtimes } from '../data/demoSchedule';
import { getBookedSeats } from '../data/demoBookings';
import { useMovies } from '../hooks/useMovies';
import { dayHeading, manilaClock, manilaDay, today } from '../utils/manila';
import { heroDates, loadUpcomingShowings, previewDates, publishedShowings, showingAvailability } from '../utils/bookingHero';
import BookingHero from '../components/BookingHero';

function Clock({ value }) {
  return <span className="board-time">{value.split('').map((part, i) => part === ':' ? <em key={i}>:</em> : <b key={i}>{part}</b>)}</span>;
}

function previewShowings(movies, currentDay) {
  const rooms = listAuditoriums();
  return previewDates(currentDay).flatMap((day) => movies
    .filter((movie) => movie.status === 'now_showing')
    .flatMap((movie) => listShowtimes(movie._id).map((slot) => ({
      _id: slot.id + '-' + day,
      movie: { _id: movie._id },
      auditorium: { name: rooms.find((room) => room.id === slot.auditoriumId)?.name || 'Cinema' },
      startTime: new Date(day + 'T' + slot.time + ':00+08:00').toISOString(),
      remainingSeats: 80 - getBookedSeats(movie._id, day, slot.time).length,
      status: 'scheduled',
      published: true,
    }))));
}

export default function Home() {
  const { movies, loading, error, reload, isDemo } = useMovies();
  const [selectedDate, setSelectedDate] = useState(today);
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleAttempt, setScheduleAttempt] = useState(0);
  const currentDay = today();

  useEffect(() => {
    const controller = new AbortController();
    setScheduleLoading(true);
    loadUpcomingShowings(api, controller.signal, today())
      .then((rows) => { setSchedule(rows); setScheduleError(''); })
      .catch((reason) => { if (reason.name !== 'AbortError') { setSchedule([]); setScheduleError(reason.message); } })
      .finally(() => { if (!controller.signal.aborted) setScheduleLoading(false); });
    return () => controller.abort();
  }, [scheduleAttempt]);

  const retry = () => { reload(); setScheduleAttempt((attempt) => attempt + 1); };

  const showings = isDemo ? previewShowings(movies, currentDay) : schedule;
  const dateOptions = heroDates(showings, currentDay);
  const coming = movies.filter((movie) => movie.status === 'coming_soon');
  const visibleShowings = publishedShowings(showings)
    .filter((showing) => manilaDay(showing.startTime) === selectedDate);
  const rows = visibleShowings.map((showing) => {
    const movie = movies.find((item) => item._id === (showing.movie?._id || showing.movie));
    const availability = showingAvailability(showing);
    return {
      id: showing._id,
      movie,
      time: manilaClock(showing.startTime),
      room: showing.auditorium?.name || 'Cinema',
      seats: showing.remainingSeats ?? 0,
      status: availability === 'started' ? 'STARTED' : availability === 'sold out' ? 'SOLD OUT' : availability === 'cancelled' ? 'CANCELLED' : showing.remainingSeats <= 10 ? 'FEW SEATS' : 'OPEN',
      bookable: availability === 'available',
    };
  }).filter((row) => row.movie).sort((a, b) => a.time.localeCompare(b.time));
  const isLoading = loading || (!isDemo && scheduleLoading);
  const pageError = error || (!isDemo && scheduleError);

  return <div className="tonight-page fade-in">
    {isDemo && <p className="demo-catalog-notice">Preview catalog · Sample movies are shown while the database is unavailable.</p>}
    <BookingHero movies={movies} showings={showings} dateOptions={dateOptions} selectedDate={selectedDate} onDateChange={setSelectedDate} loading={isLoading} error={pageError} onRetry={retry} />
    <section className="board-section" id="todays-board"><div className="section-title"><div><span className="eyebrow">Today's board</span><h2>Showing {selectedDate === currentDay ? 'today' : dayHeading(selectedDate).split(' ')[0]}</h2></div><p>All times are Manila time. Seats left update as people book.</p></div>
      {isLoading ? <div className="loading"><div className="spinner"/></div> : pageError ? <div className="empty-state"><p>{pageError}</p><button className="btn btn-primary" onClick={retry}>Try again</button></div> : rows.length ? <div className="departure-board"><div className="board-head"><span>Time</span><span>Film</span><span>Room</span><span>Seats left</span><span>Status</span><span/></div>{rows.map((row) => <div className="board-row" key={row.id}><Clock value={row.time}/><strong>{row.movie.title}</strong><span>{row.room}</span><span className="seat-digits">{String(row.seats).padStart(2,'0').split('').map((value,i)=><b key={i}>{value}</b>)}</span><span className={'board-status ' + (row.status === 'FEW SEATS' ? 'few' : row.status === 'OPEN' ? 'open' : 'closed')}>{row.status}</span>{row.bookable ? <Link className="btn btn-primary btn-small" to={'/movie/' + row.movie._id + '?' + new URLSearchParams({ date: selectedDate, time: row.time, showtime: row.id })}>Book</Link> : <span/>}</div>)}</div> : <div className="empty-state">No showings are scheduled for this day. <Link to="/movies">Browse all movies</Link></div>}
    </section>
    <section className="opening-section"><div className="section-title"><div><span className="eyebrow">Mark your calendar</span><h2>Opening soon</h2></div></div><div className="opening-grid">{coming.length ? coming.map((movie) => { const date = new Date(movie.releaseDate); return <Link className="calendar-card" to={'/movie/' + movie._id} key={movie._id}><span className="calendar-icon"><small>{date.toLocaleDateString('en-PH',{month:'short'})}</small><strong>{date.getDate()}</strong></span><span className="calendar-copy"><strong>{movie.title}</strong><small>{movie.genre.join(' · ')} · {movie.duration} min</small></span><span className="rating-pill">{movie.rating}</span></Link>; }) : <p>More films are on their way.</p>}</div></section>
    <section className="how-strip"><div><small>Step 1</small><h3>Pick a showing</h3><p>Find your film on the board and see how many seats are left.</p></div><div><small>Step 2</small><h3>Choose your seats</h3><p>The seat chart shows what is free, taken and yours.</p></div><div><small>Step 3</small><h3>Show your code</h3><p>Your ticket is kept in My tickets.</p></div></section>
  </div>;
}
