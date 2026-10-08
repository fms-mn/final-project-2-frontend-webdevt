import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { listAuditoriums, listShowtimes } from '../data/demoSchedule';
import { getBookedSeats } from '../data/demoBookings';
import { useMovies } from '../hooks/useMovies';
import HeroTrailer from '../components/HeroTrailer';
import PosterCarousel from '../components/PosterCarousel';
import ShowtimeBoard from '../components/ShowtimeBoard';
import { activeCarouselMovie, eligibleMovies } from '../utils/bookingCarousel';
import { groupShowtimesByTime, isBookableShowing, showingStatus } from '../utils/showtimesBoard';
import { manilaClock, shiftDay, today } from '../utils/manila';

const manilaDate = value => new Date(`${value}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortManilaDate = value => new Date(`${value}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', day: 'numeric' });

export default function Home() {
  const navigate = useNavigate();
  const { movies, loading, error, reload, isDemo } = useMovies();
  const [dayIndex, setDayIndex] = useState(0);
  const [selectedShowingId, setSelectedShowingId] = useState(null);
  const [activeMovieId, setActiveMovieId] = useState(null);
  const [watchingMovieId, setWatchingMovieId] = useState(null);
  const [live, setLive] = useState({ date: '', rows: [], loading: true });
  const currentDay = today();
  const days = Array.from({ length: 5 }, (_, i) => shiftDay(currentDay, i));
  const date = days[dayIndex];
  const showing = movies.filter(m => m.status === 'now_showing');
  const coming = movies.filter(m => m.status === 'coming_soon');
  useEffect(() => {
    if (loading || isDemo) return;
    let active = true;
    setLive({ date, rows: [], loading: true });
    api(`/showtimes?date=${date}&limit=200`).then(rows => { if (active) setLive({ date, rows, loading: false }); }).catch(() => { if (active) setLive({ date, rows: [], loading: false }); });
    return () => { active = false; };
  }, [date, isDemo, loading]);
  const liveRows = live.date === date ? live.rows : [];
  const rows = isDemo ? showing.flatMap(m => listShowtimes(m._id).map(s => {
    const seats = 80 - getBookedSeats(m._id, date, s.time).length;
    return {
      id: s.id, movie: m, time: s.time, room: listAuditoriums().find(room => room.id === s.auditoriumId)?.name || 'Cinema',
      seats, status: showingStatus({ startTime: `${date}T${s.time}:00+08:00`, remainingSeats: seats }),
    };
  })) : liveRows.map(s => ({
    id: s._id, movie: movies.find(m => m._id === (s.movie?._id || s.movie)),
    time: manilaClock(s.startTime), room: s.auditorium?.name || 'Cinema',
    seats: s.remainingSeats ?? 0, status: showingStatus(s),
  }));
  rows.sort((a,b) => a.time.localeCompare(b.time));
  const visibleRows = rows.filter(row => row.movie);
  const availableRows = visibleRows.filter(isBookableShowing);
  const earlierRows = date === currentDay ? visibleRows.filter(row => row.status === 'STARTED') : [];
  const boardRows = date === currentDay ? visibleRows.filter(row => row.status !== 'STARTED') : visibleRows;
  const boardGroups = groupShowtimesByTime(boardRows);
  const earlierGroups = groupShowtimesByTime(earlierRows);
  const carouselMovies = eligibleMovies(showing, availableRows);
  const featured = activeCarouselMovie(carouselMovies, activeMovieId);
  const featuredRows = availableRows.filter(row => row.movie._id === featured?._id);
  const selectedShowing = featuredRows.find(row => row.id === selectedShowingId);
  const scheduleLoading = loading || (!isDemo && (live.date !== date || live.loading));
  useEffect(() => {
    if (!scheduleLoading && activeMovieId !== featured?._id) setActiveMovieId(featured?._id || null);
  }, [scheduleLoading, activeMovieId, featured?._id]);
  const showingLink = row => `/movie/${row.movie._id}?date=${date}&time=${row.time}&showtime=${row.id}`;
  const selectMovie = id => {
    if (id === featured?._id) return;
    setWatchingMovieId(null);
    setSelectedShowingId(null);
    setActiveMovieId(id);
  };
  return <div className="tonight-page cinematic-home fade-in">
    {isDemo && <p className="demo-catalog-notice">Preview catalog · Sample movies are shown while the database is unavailable.</p>}
    <section className="cinema-hero" aria-label="Featured films and showtimes">
      <div className="cinema-hero-inner">
        <div className="cinema-feature">
          <div className="cinema-feature-screen">
            {(featured?.backdropUrl || featured?.posterUrl) && <img className="cinema-feature-backdrop" src={featured.backdropUrl || featured.posterUrl} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/filme-mark.svg'; }} />}
            {featured?.trailerId && watchingMovieId === featured._id && <HeroTrailer key={featured._id} videoId={featured.trailerId} />}
            <span className="cinema-feature-chip"><span aria-hidden="true">●</span> Featured film</span>
            {featured?.trailerId && <button type="button" className="cinema-watch-trailer" onClick={() => setWatchingMovieId(watchingMovieId === featured._id ? null : featured._id)}>{watchingMovieId === featured._id ? 'Stop Trailer' : 'Watch Trailer'}</button>}
            <div className="cinema-feature-copy"><span className="eyebrow">On our screen now</span><h1>{featured?.title || 'Your next film'}</h1><p>{featured ? <>{featured.genre.join(' · ')} <span aria-hidden="true">·</span> {featured.duration} min <span className="cinema-rating">{featured.rating}</span></> : 'Discover what is on at FILME'}</p></div>
          </div>
          {!scheduleLoading && (carouselMovies.length ? <PosterCarousel movies={carouselMovies} selectedId={featured?._id} onSelect={selectMovie} /> : <p className="poster-carousel-empty">No movies have available showtimes for this date. Try another day.</p>)}
        </div>
        <div className="cinema-picks">
          <h2 className="cinema-picks-heading">Choose your showtime</h2>
          <div className="cinema-hero-days" role="group" aria-label="Choose showing date">{days.map((d,i) => <button type="button" key={d} className={dayIndex === i ? 'active' : ''} aria-pressed={dayIndex === i} onClick={() => { setDayIndex(i); setSelectedShowingId(null); }}>{shortManilaDate(d)}</button>)}</div>
          {featured ? <article className="cinema-pick cinema-booking-pick">
            <div className="cinema-pick-art"><img src={featured.posterUrl || '/filme-mark.svg'} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/filme-mark.svg'; }} /></div>
            <div className="cinema-pick-copy"><h3>{featured.title}</h3><p>{featured.genre.join(' · ')} · {featured.duration} min · {featured.rating}</p></div>
            {scheduleLoading ? <p className="cinema-pick-empty">Loading showtimes…</p> : featuredRows.length ? <div className="cinema-pick-times" role="group" aria-label={`Available showtimes for ${featured.title}`}>{featuredRows.map(row => <button type="button" key={row.id} className={selectedShowingId === row.id ? 'selected' : ''} aria-pressed={selectedShowingId === row.id} onClick={() => setSelectedShowingId(row.id)}>{row.time}</button>)}</div> : <p className="cinema-pick-empty">No showtimes are available for this film on the selected date. Try another day.</p>}
          </article> : <p className="cinema-pick-empty">{scheduleLoading ? 'Loading showtimes…' : 'No movies have available showtimes on this date. Choose another date or explore upcoming films.'}</p>}
          <div className="cinema-booking-actions"><button type="button" className="btn btn-primary" disabled={!selectedShowing} onClick={() => navigate(showingLink(selectedShowing))}>Book Tickets</button><Link className="btn cinema-outline-btn" to="/movies">Explore Movies</Link></div>
        </div>
      </div>
    </section>
    <section className="board-section" id="todays-board" aria-label={`Showing ${manilaDate(date)}`}><div className="board-section-inner">
      <div className="board-heading"><div><span className="board-eyebrow">TODAY'S BOARD</span><h2>Showing {new Date(`${date}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long' })}</h2></div><p>All times are Manila time. Seats left update as people book.</p></div>
      {scheduleLoading ? <div className="loading"><div className="spinner"/></div> : error ? <div className="showtime-board-empty"><p>{error}</p><button className="btn btn-primary" onClick={reload}>Try again</button></div> : visibleRows.length ? <>
        {boardGroups.length ? <ShowtimeBoard groups={boardGroups} dateLabel={manilaDate(date)} showingLink={showingLink} /> : <p className="showtime-board-empty">No more showtimes are available today. Review earlier sessions below or choose another date.</p>}
        {earlierGroups.length > 0 && <details className="showtime-earlier"><summary>Earlier today <span>{earlierRows.length} {earlierRows.length === 1 ? 'showing' : 'showings'}</span></summary><ShowtimeBoard groups={earlierGroups} dateLabel={manilaDate(date)} showingLink={showingLink} /></details>}
      </> : <div className="showtime-board-empty">No showings are scheduled for this day. <Link to="/movies">Explore Movies</Link></div>}
    </div>
    </section>
    <section className="opening-section"><div className="section-title"><div><span className="eyebrow">Mark your calendar</span><h2>Opening soon</h2></div></div><div className="opening-grid">{coming.length ? coming.map(m => { const d = new Date(m.releaseDate); return <Link className="calendar-card" to={`/movie/${m._id}`} key={m._id}><span className="calendar-icon"><small>{d.toLocaleDateString('en-PH',{month:'short'})}</small><strong>{d.getDate()}</strong></span><span className="calendar-copy"><strong>{m.title}</strong><small>{m.genre.join(' · ')} · {m.duration} min</small></span><span className="rating-pill">{m.rating}</span></Link>; }) : <p>More films are on their way.</p>}</div></section>
    <section className="how-strip"><div><small>Step 1</small><h3>Pick a showing</h3><p>Find your film on the board and see how many seats are left.</p></div><div><small>Step 2</small><h3>Choose your seats</h3><p>The seat chart shows what is free, taken and yours.</p></div><div><small>Step 3</small><h3>Show your code</h3><p>Your ticket is kept in My tickets.</p></div></section>
  </div>;
}
