import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BookingHero from '../components/BookingHero';
import ShowtimeBoard from '../components/ShowtimeBoard';
import OpeningSoon from '../components/OpeningSoon';
import { listAuditoriums, listShowtimes } from '../data/demoSchedule';
import { getBookedSeats } from '../data/demoBookings';
import { useMovies } from '../hooks/useMovies';
import { heroDates, loadUpcomingShowings, previewDates } from '../utils/bookingHero';
import { groupShowtimesByTime } from '../utils/showtimesBoard';
import { manilaClock, manilaDay, today } from '../utils/manila';

const manilaDate = day => new Date(day + 'T12:00:00+08:00').toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function previewShowings(movies, currentDay) {
  const rooms = listAuditoriums();
  return previewDates(currentDay).flatMap(day => movies.filter(movie => movie.status === 'now_showing')
    .flatMap(movie => listShowtimes(movie._id).map(slot => ({
      _id: slot.id + '-' + day, movie: { _id: movie._id },
      auditorium: { name: rooms.find(room => room.id === slot.auditoriumId)?.name || 'Cinema' },
      startTime: new Date(day + 'T' + slot.time + ':00+08:00').toISOString(),
      remainingSeats: 80 - getBookedSeats(movie._id, day, slot.time).length,
      status: 'scheduled', published: true,
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
    if (isDemo) return undefined;
    const controller = new AbortController();
    setScheduleLoading(true);
    loadUpcomingShowings(api, controller.signal, today())
      .then(rows => { setSchedule(rows); setScheduleError(''); })
      .catch(reason => { if (reason.name !== 'AbortError') { setSchedule([]); setScheduleError(reason.message); } })
      .finally(() => { if (!controller.signal.aborted) setScheduleLoading(false); });
    return () => controller.abort();
  }, [isDemo, scheduleAttempt]);

  const retry = () => { reload(); setScheduleAttempt(attempt => attempt + 1); };
  const showings = isDemo ? previewShowings(movies, currentDay) : schedule;
  const dateOptions = heroDates(showings, currentDay);
  const coming = movies.filter(movie => movie.status === 'coming_soon');
  const rows = showings.filter(showing => manilaDay(showing.startTime) === selectedDate).map(showing => {
    const movie = movies.find(item => item._id === (showing.movie?._id || showing.movie));
    const seats = showing.remainingSeats ?? 0;
    const status = showing.status === 'cancelled' ? 'CANCELLED'
      : showing.bookable === false || new Date(showing.startTime) <= new Date() ? 'STARTED'
        : seats <= 0 ? 'SOLD OUT' : seats <= 10 ? 'FEW SEATS' : 'OPEN';
    return { id: showing._id, movie, time: manilaClock(showing.startTime), room: showing.auditorium?.name || 'Cinema', seats, status };
  }).filter(row => row.movie).sort((a, b) => a.time.localeCompare(b.time));
  const earlierRows = selectedDate === currentDay ? rows.filter(row => row.status === 'STARTED') : [];
  const boardRows = selectedDate === currentDay ? rows.filter(row => row.status !== 'STARTED') : rows;
  const boardGroups = groupShowtimesByTime(boardRows);
  const earlierGroups = groupShowtimesByTime(earlierRows);
  const isLoading = loading || (!isDemo && scheduleLoading);
  const pageError = error || (!isDemo && scheduleError);
  const showingLink = row => '/movie/' + row.movie._id + '?' + new URLSearchParams({ date: selectedDate, time: row.time, showtime: row.id });

  return <div className="tonight-page cinematic-home fade-in">
    {isDemo && <p className="demo-catalog-notice">Preview catalog · Sample movies are shown while the database is unavailable.</p>}
    <BookingHero movies={movies} showings={showings} dateOptions={dateOptions} selectedDate={selectedDate} onDateChange={setSelectedDate} loading={isLoading} error={pageError} onRetry={retry} isDemo={isDemo} />
    <section className="board-section" id="todays-board" aria-label={'Showing ' + manilaDate(selectedDate)}><div className="board-section-inner">
      <div className="board-heading"><div><span className="board-eyebrow">TODAY'S BOARD</span><h2>Showing {new Date(selectedDate + 'T12:00:00+08:00').toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long' })}</h2></div><p>All times are Manila time. Seats left update as people book.</p></div>
      {isLoading ? <div className="loading"><div className="spinner" /></div> : pageError ? <div className="showtime-board-empty"><p>{pageError}</p><button className="btn btn-primary" onClick={retry}>Try again</button></div> : rows.length ? <>
        {boardGroups.length ? <ShowtimeBoard groups={boardGroups} dateLabel={manilaDate(selectedDate)} showingLink={showingLink} /> : <p className="showtime-board-empty">No more showtimes are available today. Review earlier sessions below or choose another date.</p>}
        {earlierGroups.length > 0 && <details className="showtime-earlier"><summary>Earlier today <span>{earlierRows.length} {earlierRows.length === 1 ? 'showing' : 'showings'}</span></summary><ShowtimeBoard groups={earlierGroups} dateLabel={manilaDate(selectedDate)} showingLink={showingLink} /></details>}
      </> : <div className="showtime-board-empty">No showings are scheduled for this day. <Link to="/movies">Explore Movies</Link></div>}
    </div></section>
    <OpeningSoon movies={coming} currentDay={currentDay} />
    <section className="how-strip"><div><small>Step 1</small><h3>Pick a showing</h3><p>Find your film on the board and see how many seats are left.</p></div><div><small>Step 2</small><h3>Choose your seats</h3><p>The seat chart shows what is free, taken and yours.</p></div><div><small>Step 3</small><h3>Show your code</h3><p>Your ticket is kept in My tickets.</p></div></section>
  </div>;
}
