import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { listAuditoriums, listShowtimes } from '../data/demoSchedule';
import { getBookedSeats } from '../data/demoBookings';
import { useMovies } from '../hooks/useMovies';
import HeroTrailer from '../components/HeroTrailer';

const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const timeLabel = value => new Date(value).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false });
function Clock({ value }) { return <span className="board-time">{value.split('').map((part, i) => part === ':' ? <em key={i}>:</em> : <b key={i}>{part}</b>)}</span>; }

export default function Home() {
  const { movies, loading, error, reload, isDemo } = useMovies();
  const [dayIndex, setDayIndex] = useState(0);
  const [live, setLive] = useState([]);
  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
  const day = days[dayIndex], date = dateKey(day);
  const showing = movies.filter(m => m.status === 'now_showing');
  const coming = movies.filter(m => m.status === 'coming_soon');
  useEffect(() => {
    let active = true;
    api(`/showtimes?date=${date}&limit=200`).then(rows => { if (active) setLive(rows); }).catch(() => { if (active) setLive([]); });
    return () => { active = false; };
  }, [date]);
  const rows = live.length ? live.map(s => ({
    id: s._id, movie: movies.find(m => m._id === (s.movie?._id || s.movie)),
    time: timeLabel(s.startTime), room: s.auditorium?.name || 'Cinema',
    seats: s.remainingSeats ?? 0, status: new Date(s.startTime) <= new Date() ? 'STARTED' : s.remainingSeats > 0 && s.remainingSeats <= 10 ? 'FEW SEATS' : 'OPEN',
  })).filter(s => s.movie) : isDemo ? showing.flatMap(m => listShowtimes(m._id).map(s => ({
    id: s.id, movie: m, time: s.time, room: listAuditoriums().find(room => room.id === s.auditoriumId)?.name || 'Cinema',
    seats: 80 - getBookedSeats(m._id, date, s.time).length,
    status: new Date(`${date}T${s.time}:00`) <= new Date() ? 'STARTED' : 'OPEN',
  }))).sort((a,b) => a.time.localeCompare(b.time)) : [];
  const availableRows = rows.filter(row => row.status !== 'STARTED' && row.seats > 0);
  const heroMovies = showing.filter(movie => availableRows.some(row => row.movie._id === movie._id)).slice(0, 4);
  const featured = heroMovies[0] || showing[0];
  const featuredRows = availableRows.filter(row => row.movie._id === featured?._id).slice(0, 4);
  const showingLink = row => `/movie/${row.movie._id}?date=${date}&time=${row.time}&showtime=${row.id}`;
  return <div className="tonight-page cinematic-home fade-in">
    {isDemo && <p className="demo-catalog-notice">Preview catalog · Sample movies are shown while the database is unavailable.</p>}
    <section className="cinema-hero" aria-label="Featured films and showtimes">
      <div className="cinema-hero-inner">
        <div className="cinema-feature">
          <div className="cinema-feature-screen">
            {featured?.backdropUrl && <img className="cinema-feature-backdrop" src={featured.backdropUrl} alt="" />}
            {featured?.trailerId && <HeroTrailer key={featured.trailerId} videoId={featured.trailerId} />}
            <span className="cinema-feature-chip"><span aria-hidden="true">●</span> {featured?.trailerId ? 'Trailer · muted' : 'Featured film'}</span>
            <div className="cinema-feature-copy"><span className="eyebrow">On our screen now</span><h1>{featured?.title || 'Your next film'}</h1><p>{featured ? <>{featured.genre.join(' · ')} <span aria-hidden="true">·</span> {featured.duration} min <span className="cinema-rating">{featured.rating}</span></> : 'Discover what is on at FILME'}</p></div>
          </div>
          <div className="cinema-feature-footer">
            <div className="cinema-feature-times" aria-label="Featured film showtimes">{featuredRows.map(row => <Link key={row.id} to={showingLink(row)} aria-label={`${featured.title} at ${row.time}`}>{row.time}</Link>)}</div>
            <div className="cinema-feature-actions"><Link className="btn cinema-outline-btn" to="/movies">Browse all movies</Link>{featured && <Link className="btn btn-primary" to={featuredRows.length ? showingLink(featuredRows[0]) : `/movie/${featured._id}`}>{featuredRows.length ? 'Book tickets' : 'View film'}</Link>}</div>
          </div>
        </div>
        <div className="cinema-picks"><span className="eyebrow">Pick a film · {dayIndex === 0 ? 'Tonight' : day.toLocaleDateString('en-PH',{weekday:'long'})}</span>
          {heroMovies.length ? <div className="cinema-pick-list">{heroMovies.map((movie, index) => { const slots = availableRows.filter(row => row.movie._id === movie._id).slice(0, 4); return <article className="cinema-pick" key={movie._id}><div className={`cinema-pick-art cinema-pick-art-${index + 1}`}><img src={movie.posterUrl || '/filme-mark.svg'} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/filme-mark.svg'; }} /></div><div className="cinema-pick-copy"><Link to={`/movie/${movie._id}`}><h2>{movie.title}</h2></Link><p>{movie.genre.join(' · ')} · {movie.duration} min · {movie.rating}</p></div><div className="cinema-pick-times">{slots.map(row => <Link key={row.id} to={showingLink(row)} aria-label={`${movie.title} at ${row.time}`}>{row.time}</Link>)}</div></article>; })}</div> : <p className="cinema-pick-empty">No upcoming showtimes today. Choose another date below.</p>}
          <div className="cinema-hero-days" role="group" aria-label="Choose showing date">{days.map((d,i) => <button type="button" key={dateKey(d)} className={dayIndex === i ? 'active' : ''} aria-pressed={dayIndex === i} onClick={() => setDayIndex(i)}>{d.toLocaleDateString('en-PH',{weekday:'short',day:'numeric'})}</button>)}</div>
        </div>
      </div>
    </section>
    <section className="board-section" id="todays-board"><div className="section-title"><div><span className="eyebrow">Today's board</span><h2>Showing {dayIndex === 0 ? 'today' : day.toLocaleDateString('en-PH',{weekday:'long'})}</h2></div><p>All times are Manila time. Seats left update as people book.</p></div>
      {loading ? <div className="loading"><div className="spinner"/></div> : error ? <div className="empty-state"><p>{error}</p><button className="btn btn-primary" onClick={reload}>Try again</button></div> : rows.length ? <div className="departure-board"><div className="board-head"><span>Time</span><span>Film</span><span>Room</span><span>Seats left</span><span>Status</span><span/></div>{rows.map(r => <div className="board-row" key={r.id}><Clock value={r.time}/><strong>{r.movie.title}</strong><span>{r.room}</span><span className="seat-digits">{String(r.seats).padStart(2,'0').split('').map((v,i)=><b key={i}>{v}</b>)}</span><span className={`board-status ${r.status === 'FEW SEATS' ? 'few' : r.status === 'OPEN' && r.seats ? 'open' : 'closed'}`}>{r.status === 'OPEN' && !r.seats ? 'SOLD OUT' : r.status}</span>{r.status !== 'STARTED' && r.seats ? <Link className="btn btn-primary btn-small" to={`/movie/${r.movie._id}?date=${date}&time=${r.time}&showtime=${r.id}`}>Book</Link> : <span/>}</div>)}</div> : <div className="empty-state">No showings are scheduled for this day. <Link to="/movies">Browse all movies</Link></div>}
    </section>
    <section className="opening-section"><div className="section-title"><div><span className="eyebrow">Mark your calendar</span><h2>Opening soon</h2></div></div><div className="opening-grid">{coming.length ? coming.map(m => { const d = new Date(m.releaseDate); return <Link className="calendar-card" to={`/movie/${m._id}`} key={m._id}><span className="calendar-icon"><small>{d.toLocaleDateString('en-PH',{month:'short'})}</small><strong>{d.getDate()}</strong></span><span className="calendar-copy"><strong>{m.title}</strong><small>{m.genre.join(' · ')} · {m.duration} min</small></span><span className="rating-pill">{m.rating}</span></Link>; }) : <p>More films are on their way.</p>}</div></section>
    <section className="how-strip"><div><small>Step 1</small><h3>Pick a showing</h3><p>Find your film on the board and see how many seats are left.</p></div><div><small>Step 2</small><h3>Choose your seats</h3><p>The seat chart shows what is free, taken and yours.</p></div><div><small>Step 3</small><h3>Show your code</h3><p>Your ticket is kept in My tickets.</p></div></section>
  </div>;
}
