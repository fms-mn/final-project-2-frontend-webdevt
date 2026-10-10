import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import TrailerShowcase from '../components/TrailerShowcase';
import ShowtimeBoard from '../components/ShowtimeBoard';
import OpeningSoon from '../components/OpeningSoon';
import './homeBooking.css';
import { DEMO_RULES, isDemoSlotSafe, listAuditoriums, listShowtimes } from '../data/demoSchedule';
import { demoRemainingSeats } from '../data/demoBookings';
import { useMovies } from '../hooks/useMovies';
import { heroDates, loadUpcomingShowings, previewDates } from '../utils/bookingHero';
import { groupShowtimesByMovie } from '../utils/showtimesBoard';
import { manilaClock, manilaDay, today } from '../utils/manila';

const manilaDate = day => new Date(day + 'T12:00:00+08:00').toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function previewShowings(movies, currentDay) {
  const rooms = listAuditoriums();
  return previewDates(currentDay).flatMap(day => movies.filter(movie => movie.status === 'now_showing')
    .flatMap(movie => listShowtimes(movie._id, day).map(slot => ({
      _id: slot.id, movie: { _id: movie._id },
      ...slot, verified: isDemoSlotSafe(movie._id, day, slot.time),
      ticketPrice: movie.price * 100,
      bookable: Date.parse(day + 'T' + slot.time + ':00+08:00') > Date.now() + DEMO_RULES.salesCutoffMinutes * 60000,
      auditorium: { _id: slot.auditoriumId, name: rooms.find(room => room.id === slot.auditoriumId)?.name || 'Cinema' },
      startTime: new Date(day + 'T' + slot.time + ':00+08:00').toISOString(),
      remainingSeats: demoRemainingSeats(movie._id, day, slot.time),
      status: 'scheduled', published: true,
    }))));
}

export default function Home() {
  const { user } = useAuth();
  const [, setClockTick] = useState(0);
  useEffect(() => { const timer = setInterval(() => setClockTick(value => value + 1), 30000); return () => clearInterval(timer); }, []);
  const { movies, loading, error, reload, isDemo } = useMovies();
  const [selectedDate, setSelectedDate] = useState(today);
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleAttempt, setScheduleAttempt] = useState(0);
  const currentDay = today();

  useEffect(() => {
    if (user?.isDemo) return undefined;
    const controller = new AbortController();
    setSchedule([]);
    setScheduleError('');
    setScheduleLoading(true);
    loadUpcomingShowings(api, controller.signal, today())
      .then(rows => { setSchedule(rows); setScheduleError(''); })
      .catch(reason => { if (reason.name !== 'AbortError') { setSchedule([]); setScheduleError('The showing service is unavailable. Please try again.'); } })
      .finally(() => { if (!controller.signal.aborted) setScheduleLoading(false); });
    return () => controller.abort();
  }, [user?.isDemo, scheduleAttempt]);

  const retry = () => { reload(); setScheduleAttempt(attempt => attempt + 1); };
  const showings = isDemo ? previewShowings(movies, currentDay) : schedule;
  const dateOptions = heroDates(showings, currentDay);
  const coming = movies.filter(movie => movie.status === 'coming_soon');
  const rows = showings.filter(showing => manilaDay(showing.startTime) === selectedDate).map(showing => {
    const movie = movies.find(item => item._id === (showing.movie?._id || showing.movie));
    const seats = showing.remainingSeats ?? 0;
    const status = showing.verified !== true || showing.published === false || showing.isPublished === false ? 'UNAVAILABLE' : showing.status === 'cancelled' ? 'CANCELLED'
      : new Date(showing.startTime) <= new Date() ? 'STARTED'
        : showing.bookable === false ? 'SALES CLOSED'
        : seats <= 0 ? 'SOLD OUT' : seats <= 10 ? 'FEW SEATS' : 'OPEN';
    return { id: showing._id, movie, format: showing.format, language: showing.language, subtitles: showing.subtitles, price: showing.ticketPrice != null ? showing.ticketPrice / 100 : null, time: manilaClock(showing.startTime), room: showing.auditorium?.name || 'Cinema', seats, status };
  }).filter(row => row.movie).sort((a, b) => a.time.localeCompare(b.time));
  const earlierRows = selectedDate === currentDay ? rows.filter(row => row.status === 'STARTED') : [];
  const boardRows = selectedDate === currentDay ? rows.filter(row => row.status !== 'STARTED') : rows;
  const boardGroups = groupShowtimesByMovie(boardRows);
  const earlierGroups = groupShowtimesByMovie(earlierRows);
  const isLoading = loading || (!isDemo && scheduleLoading);
  const pageError = error || (!isDemo && scheduleError);
  const showingLink = row => '/movie/' + row.movie._id + '?' + new URLSearchParams({ date: selectedDate, time: row.time, showtime: row.id });

  return <div className="tonight-page cinematic-home fade-in">
    {user?.role === 'admin' && <p className="demo-catalog-notice">Admin preview — customer booking is disabled.</p>}
    <TrailerShowcase movies={movies} showings={showings} selectedDate={selectedDate} loading={isLoading} error={pageError} isDemo={isDemo} />
    <section className="board-section" id="todays-board" aria-label={'Showing ' + manilaDate(selectedDate)}><div className="board-section-inner">
      <div className="board-heading"><div><span className="board-eyebrow">THE SCHEDULE</span><h2>Showing {manilaDate(selectedDate)}</h2></div><p>All times are Manila time. Seats left update as people book.</p></div>
      <label className="board-date-selector">Showing date<select aria-label="Schedule date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)}>{dateOptions.map(day => <option key={day} value={day}>{day === currentDay ? 'Today' : new Date(day + 'T12:00:00+08:00').toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' })}</option>)}</select></label>
      {isLoading ? <div className="loading"><div className="spinner" /></div> : pageError ? <div className="showtime-board-empty"><p>{pageError}</p><button className="btn btn-primary" onClick={retry}>Try again</button></div> : rows.length ? <>
        {boardGroups.length ? <ShowtimeBoard groups={boardGroups} dateLabel={manilaDate(selectedDate)} showingLink={showingLink} role={user?.role} /> : <p className="showtime-board-empty">No more showtimes are available today. Review earlier sessions below or choose another date.</p>}
        {earlierGroups.length > 0 && <details className="showtime-earlier"><summary>Earlier today <span>{earlierRows.length} {earlierRows.length === 1 ? 'showing' : 'showings'}</span></summary><ShowtimeBoard groups={earlierGroups} dateLabel={manilaDate(selectedDate)} showingLink={showingLink} role={user?.role} /></details>}
      </> : <div className="showtime-board-empty">No showings are scheduled for this day. <Link to="/movies">Explore Movies</Link></div>}
    </div></section>
    <OpeningSoon movies={coming} currentDay={currentDay} />
  </div>;
}
