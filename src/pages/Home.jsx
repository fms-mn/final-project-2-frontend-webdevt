import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { listAuditoriums, listShowtimes } from '../data/demoSchedule';
import { getBookedSeats } from '../data/demoBookings';
import { useMovies } from '../hooks/useMovies';
import HeroTrailer from '../components/HeroTrailer';

const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const timeLabel = value => new Date(value).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false });
function Clock({ value }) { return <span className="board-time">{value.split('').map((part, i) => part === ':' ? <em key={i}>:</em> : <b key={i}>{part}</b>)}</span>; }

export default function Home() {
  const navigate = useNavigate();
  const { movies, loading, error, reload, isDemo } = useMovies();
  const [dayIndex, setDayIndex] = useState(0);
  const [selectedShowingId, setSelectedShowingId] = useState(null);
  const [live, setLive] = useState({ date: '', rows: [], loading: true });
  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
  const day = days[dayIndex], date = dateKey(day);
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
  const rows = isDemo ? showing.flatMap(m => listShowtimes(m._id).map(s => ({
    id: s.id, movie: m, time: s.time, room: listAuditoriums().find(room => room.id === s.auditoriumId)?.name || 'Cinema',
    seats: 80 - getBookedSeats(m._id, date, s.time).length,
    status: new Date(`${date}T${s.time}:00`) <= new Date() ? 'STARTED' : 'OPEN',
  }))) : liveRows.map(s => ({
    id: s._id, movie: movies.find(m => m._id === (s.movie?._id || s.movie)),
    time: timeLabel(s.startTime), room: s.auditorium?.name || 'Cinema',
    seats: s.remainingSeats ?? 0, status: new Date(s.startTime) <= new Date() ? 'STARTED' : s.remainingSeats > 0 && s.remainingSeats <= 10 ? 'FEW SEATS' : 'OPEN',
  }));
  rows.sort((a,b) => a.time.localeCompare(b.time));
  const visibleRows = rows.filter(row => row.movie);
  const availableRows = visibleRows.filter(row => row.status !== 'STARTED' && row.seats > 0);
  const featured = showing[0];
  const featuredRows = availableRows.filter(row => row.movie._id === featured?._id);
  const selectedShowing = featuredRows.find(row => row.id === selectedShowingId);
  const scheduleLoading = loading || (!isDemo && (live.date !== date || live.loading));
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
        </div>
        <div className="cinema-picks">
          <h2 className="cinema-picks-heading">Choose your showtime</h2>
          <div className="cinema-hero-days" role="group" aria-label="Choose showing date">{days.map((d,i) => <button type="button" key={dateKey(d)} className={dayIndex === i ? 'active' : ''} aria-pressed={dayIndex === i} onClick={() => { setDayIndex(i); setSelectedShowingId(null); }}>{d.toLocaleDateString('en-PH',{weekday:'short',day:'numeric'})}</button>)}</div>
          {featured ? <article className="cinema-pick cinema-booking-pick">
            <div className="cinema-pick-art"><img src={featured.posterUrl || '/filme-mark.svg'} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/filme-mark.svg'; }} /></div>
            <div className="cinema-pick-copy"><h3>{featured.title}</h3><p>{featured.genre.join(' · ')} · {featured.duration} min · {featured.rating}</p></div>
            {scheduleLoading ? <p className="cinema-pick-empty">Loading showtimes…</p> : featuredRows.length ? <div className="cinema-pick-times" role="group" aria-label={`Available showtimes for ${featured.title}`}>{featuredRows.map(row => <button type="button" key={row.id} className={selectedShowingId === row.id ? 'selected' : ''} aria-pressed={selectedShowingId === row.id} onClick={() => setSelectedShowingId(row.id)}>{row.time}</button>)}</div> : <p className="cinema-pick-empty">No showtimes are available for this film on the selected date. Try another day.</p>}
          </article> : <p className="cinema-pick-empty">No films are showing yet. <Link to="/movies">Explore Movies</Link> for upcoming releases.</p>}
          <div className="cinema-booking-actions"><button type="button" className="btn btn-primary" disabled={!selectedShowing} onClick={() => navigate(showingLink(selectedShowing))}>Book Tickets</button><Link className="btn cinema-outline-btn" to="/movies">Explore Movies</Link></div>
        </div>
      </div>
    </section>
    <section className="board-section" id="todays-board"><div className="section-title"><div><h2>Showtimes</h2><p className="board-selected-date">{day.toLocaleDateString('en-PH',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div><p>All times are Manila time. Seats left update as people book.</p></div>
      {scheduleLoading ? <div className="loading"><div className="spinner"/></div> : error ? <div className="empty-state"><p>{error}</p><button className="btn btn-primary" onClick={reload}>Try again</button></div> : visibleRows.length ? <div className="departure-board"><div className="board-head"><span>Time</span><span>Film</span><span>Room</span><span>Seats left</span><span>Status</span><span/></div>{visibleRows.map(r => <div className="board-row" key={r.id}><Clock value={r.time}/><strong>{r.movie.title}</strong><span>{r.room}</span><span className="seat-digits">{String(r.seats).padStart(2,'0').split('').map((v,i)=><b key={i}>{v}</b>)}</span><span className={`board-status ${r.status === 'FEW SEATS' ? 'few' : r.status === 'OPEN' && r.seats ? 'open' : 'closed'}`}>{r.status === 'OPEN' && !r.seats ? 'SOLD OUT' : r.status}</span>{r.status !== 'STARTED' && r.seats ? <Link className="btn btn-primary btn-small" to={showingLink(r)}>Book</Link> : <span/>}</div>)}</div> : <div className="empty-state">No showings are scheduled for this day. <Link to="/movies">Explore Movies</Link></div>}
    </section>
    <section className="opening-section"><div className="section-title"><div><span className="eyebrow">Mark your calendar</span><h2>Opening soon</h2></div></div><div className="opening-grid">{coming.length ? coming.map(m => { const d = new Date(m.releaseDate); return <Link className="calendar-card" to={`/movie/${m._id}`} key={m._id}><span className="calendar-icon"><small>{d.toLocaleDateString('en-PH',{month:'short'})}</small><strong>{d.getDate()}</strong></span><span className="calendar-copy"><strong>{m.title}</strong><small>{m.genre.join(' · ')} · {m.duration} min</small></span><span className="rating-pill">{m.rating}</span></Link>; }) : <p>More films are on their way.</p>}</div></section>
    <section className="how-strip"><div><small>Step 1</small><h3>Pick a showing</h3><p>Find your film on the board and see how many seats are left.</p></div><div><small>Step 2</small><h3>Choose your seats</h3><p>The seat chart shows what is free, taken and yours.</p></div><div><small>Step 3</small><h3>Show your code</h3><p>Your ticket is kept in My tickets.</p></div></section>
  </div>;
}
