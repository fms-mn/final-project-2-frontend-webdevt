import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiChevronDown, FiChevronUp, FiGrid, FiPlay, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { dayHeading, manilaClock, today } from '../utils/manila';
import { moviesForDay, showingAvailability, showingsForMovie } from '../utils/bookingHero';
import { trailerVideoId } from '../utils/trailer';
import HeroTrailer from './HeroTrailer';
import './bookingHero.css';

const shortDay = (day) => {
  const date = new Date(day + 'T12:00:00+08:00');
  return date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' }) + ' ' + date.getDate();
};
const chooserDay = (day) => new Date(day + 'T12:00:00+08:00').toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', day: 'numeric', month: 'short' });
const runtime = (minutes) => Math.floor(minutes / 60) + 'h ' + String(minutes % 60).padStart(2, '0') + 'm';

export default function BookingHero({ movies, showings, dateOptions, selectedDate, onDateChange, loading, error, onRetry }) {
  const { user } = useAuth();
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failedTrailerId, setFailedTrailerId] = useState('');
  const [now, setNow] = useState(() => new Date());
  const triggerRef = useRef(null);
  const chooserRef = useRef(null);

  const availableMovies = moviesForDay(movies, showings, selectedDate);
  const movie = availableMovies.find((item) => item._id === selectedMovieId) || availableMovies[0];
  const slots = movie ? showingsForMovie(showings, selectedDate, movie._id) : [];
  const selectedSlot = slots.find((slot) => slot._id === selectedShowtimeId && showingAvailability(slot, now) === 'available');
  const videoId = trailerVideoId(movie);
  const trailerAvailable = Boolean(videoId) && failedTrailerId !== videoId;

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  useEffect(() => {
    if (!chooserOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      chooserRef.current?.querySelector('.cinema-chooser-close')?.focus();
    });
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setChooserOpen(false);
      }
      if (event.key === 'Tab') {
        const focusable = [...chooserRef.current.querySelectorAll('button:not([disabled])')];
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [chooserOpen]);

  const changeDate = (nextDate) => {
    if (nextDate === selectedDate) return;
    const nextMovies = moviesForDay(movies, showings, nextDate);
    setSelectedMovieId(nextMovies.some((item) => item._id === movie?._id) ? movie._id : nextMovies[0]?._id || '');
    setSelectedShowtimeId('');
    setPlaying(false);
    setFailedTrailerId('');
    setChooserOpen(false);
    onDateChange(nextDate);
  };

  const selectMovie = (nextMovie) => {
    setSelectedMovieId(nextMovie._id);
    setSelectedShowtimeId('');
    setPlaying(false);
    setFailedTrailerId('');
    setChooserOpen(false);
  };

  const failTrailer = () => {
    setPlaying(false);
    setFailedTrailerId(videoId);
  };

  const bookingLink = selectedSlot && movie
    ? '/movie/' + encodeURIComponent(movie._id) + '?' + new URLSearchParams({
      date: selectedDate, time: manilaClock(selectedSlot.startTime), showtime: selectedSlot._id,
    })
    : '';

  return <section className={'cinema-hero' + (chooserOpen ? ' chooser-open' : '') + (playing ? ' trailer-open' : '')} aria-label="Choose a movie and showing">
    <div className="cinema-visual" aria-hidden="true">
      {movie && <div className="cinema-backdrop" key={movie._id}>
        <img className="cinema-backdrop-blur" src={movie.backdropUrl || movie.posterUrl} alt="" />
        <img className="cinema-backdrop-art" src={movie.backdropUrl || movie.posterUrl} alt="" />
      </div>}
      <div className="cinema-visual-shade" />
    </div>
    {playing && videoId && <HeroTrailer key={movie._id + '-' + selectedDate} videoId={videoId} onFailure={failTrailer} />}
    <div className="cinema-topbar">
      <button ref={triggerRef} type="button" className="cinema-choose-trigger" aria-expanded={chooserOpen} aria-controls="cinema-movie-chooser" onClick={() => setChooserOpen((open) => !open)}>
        <FiGrid aria-hidden="true" />
        <span>Choose a movie</span>
        <b className="cinema-count">{availableMovies.length} {availableMovies.length === 1 ? 'movie' : 'movies'} showing</b>
        {chooserOpen ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
      </button>
      <div className="cinema-date-list" role="group" aria-label="Showing date">
        {dateOptions.map((day) => <button type="button" key={day} className={day === selectedDate ? 'active' : ''} aria-pressed={day === selectedDate} onClick={() => changeDate(day)}>
          {day === today() ? 'Today' : shortDay(day)}
        </button>)}
      </div>
    </div>
    {playing && <button type="button" className="cinema-close-trailer" onClick={() => setPlaying(false)} aria-label="Close trailer and return to movie preview"><FiX aria-hidden="true" /> Close trailer</button>}
    {!playing && <div className="cinema-info" key={(movie?._id || 'empty') + '-' + selectedDate} aria-live="polite">
      {loading ? <div className="cinema-message"><h1>Loading showings…</h1></div>
        : error ? <div className="cinema-message"><h1>Showings unavailable</h1><p>{error}</p><button type="button" className="cinema-action cinema-play" onClick={onRetry}>Try again</button></div>
          : movie ? <>
            <h1>{movie.title}</h1>
            <p className="cinema-meta">{[...movie.genre, movie.rating, runtime(movie.duration)].filter(Boolean).join(' · ')}</p>
            <div className="cinema-showing-label">Showtimes <span>·</span> {selectedDate === today() ? 'Today' : shortDay(selectedDate)}</div>
            <div className="cinema-showtimes" role="group" aria-label={'Showtimes for ' + movie.title + ' on ' + dayHeading(selectedDate)}>
              {slots.map((slot) => {
                const availability = showingAvailability(slot, now);
                return <button type="button" key={slot._id} className={selectedShowtimeId === slot._id ? 'selected' : ''} aria-pressed={selectedShowtimeId === slot._id} disabled={availability !== 'available'} title={availability === 'available' ? undefined : availability} onClick={() => setSelectedShowtimeId(slot._id)}>{manilaClock(slot.startTime)}</button>;
              })}
            </div>
            <p className="cinema-hint">{selectedSlot ? manilaClock(selectedSlot.startTime) + ' selected · choose your seats next.' : 'Pick a showtime to enable booking.'}</p>
            <div className="cinema-actions">
              {trailerAvailable ? <button type="button" className="cinema-action cinema-play" onClick={() => setPlaying(true)}><FiPlay aria-hidden="true" /> Play trailer</button> : <span className="cinema-no-trailer" role="status">{failedTrailerId === videoId && videoId ? 'Trailer could not be played.' : 'Trailer unavailable.'}</span>}
              {bookingLink && user?.role !== 'admin'
                ? <Link className="cinema-action cinema-book" to={bookingLink}>Book tickets</Link>
                : <button type="button" className="cinema-action cinema-book" disabled>Book tickets</button>}
            </div>
          </> : <div className="cinema-message"><span className="cinema-showing-label">{dayHeading(selectedDate)}</span><h1>No movies showing</h1><p>There are no published showings for this date. Choose another day or browse all movies.</p><Link to="/movies" className="cinema-action cinema-play">Browse movies</Link></div>}
    </div>}
    {chooserOpen && <>
      <button type="button" className="cinema-chooser-scrim" aria-label="Close movie chooser" onClick={() => setChooserOpen(false)} />
      <div id="cinema-movie-chooser" className="cinema-chooser" role="dialog" aria-modal="true" aria-labelledby="cinema-chooser-title" ref={chooserRef}>
        <div className="cinema-chooser-heading"><h2 id="cinema-chooser-title">{chooserDay(selectedDate)} · Pick a movie</h2><button type="button" className="cinema-chooser-close" aria-label="Close movie chooser" onClick={() => setChooserOpen(false)}><FiX aria-hidden="true" /></button></div>
        <div className="cinema-chooser-scroll">
          {availableMovies.length ? <div className="cinema-chooser-grid">{availableMovies.map((item) => <button key={item._id} type="button" className={'cinema-poster-choice' + (movie?._id === item._id ? ' selected' : '')} aria-pressed={movie?._id === item._id} aria-label={'Select ' + item.title + ', ' + runtime(item.duration)} onClick={() => selectMovie(item)}>
            <span className="cinema-poster"><img src={item.posterUrl} alt="" loading="lazy" />{movie?._id === item._id && <span className="cinema-poster-check"><FiCheck aria-hidden="true" /></span>}</span>
            <strong>{item.title}</strong><small>{runtime(item.duration)}</small>
          </button>)}</div> : <p className="cinema-chooser-empty">No movies are showing on this date.</p>}
        </div>
      </div>
    </>}
  </section>;
}
