import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar } from 'react-icons/fi';
import { daysUntilOpening, googleCalendarLink, openingDate } from '../utils/openingSoon';
import './openingSoon.css';

function OpeningCard({ movie, currentDay }) {
  const [posterFailed, setPosterFailed] = useState(false);
  const day = openingDate(movie);
  const date = day ? new Date(`${day}T12:00:00+08:00`) : null;
  const daysLeft = day ? daysUntilOpening(day, currentDay) : null;
  const calendarUrl = day ? googleCalendarLink(movie, day, window.location.origin) : null;

  return <article className="opening-card">
    <Link className="opening-poster" to={`/movie/${movie._id}`} state={{ browsingPage: 'home' }} aria-label={`Preview ${movie.title}`}>
      {movie.posterUrl && !posterFailed && <img src={movie.posterUrl} alt="" onError={() => setPosterFailed(true)} />}
      {(!movie.posterUrl || posterFailed) && <span>POSTER</span>}
    </Link>
    <div className="opening-card-body">
      <div className="opening-date-line"><span className="opening-date-pill">{date ? date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).toUpperCase() : 'TBA'}</span><span className="opening-countdown">{daysLeft === null ? 'DATE TO BE ANNOUNCED' : daysLeft === 0 ? 'OPENS TODAY' : `IN ${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'}`}</span></div>
      <Link className="opening-title" to={`/movie/${movie._id}`} state={{ browsingPage: 'home' }}>{movie.title}</Link>
      {(movie.upcomingShowings ?? 0) > 0 && <Link className="opening-more-details" to={`/movie/${movie._id}`} state={{ browsingPage: 'home' }}>Book advance tickets →</Link>}
      <Link className="opening-more-details" to={'/movie/' + movie._id + '?details=1'} state={{ browsingPage: 'home' }} aria-label={`More details about ${movie.title}`}>More details</Link>
      <p className="opening-details">{[...movie.genre, movie.rating, movie.duration && `${movie.duration} min`].filter(Boolean).join(' · ')}</p>
    </div>
    <div className="opening-calendar-action">{calendarUrl
        ? <a className="opening-remind" href={calendarUrl} target="_blank" rel="noopener noreferrer" aria-label={`Add ${movie.title} release to Google Calendar`}><FiCalendar aria-hidden="true" />Add to Calendar</a>
        : <button type="button" className="opening-remind" disabled><FiCalendar aria-hidden="true" />Add to Calendar</button>}
        <span className="opening-calendar-hint">{calendarUrl ? 'Save in Google Calendar and choose your reminder.' : 'Release date to be announced.'}</span></div>
  </article>;
}

export default function OpeningSoon({ movies, currentDay, loading = false, error = '', onRetry }) {
  return <section className="opening-section" aria-labelledby="opening-heading"><div className="opening-section-inner">
    <div className="opening-heading"><span className="opening-eyebrow">Mark your calendar</span><h2 id="opening-heading">Opening soon</h2></div>
    {loading ? <div className="loading" role="status" aria-label="Loading upcoming releases"><div className="spinner" aria-hidden="true" /></div>
      : error ? <div className="opening-error" role="alert"><p>{error}</p><button type="button" className="btn btn-primary" onClick={onRetry}>Try again</button></div>
      : movies.length ? <div className="opening-grid">{movies.map(movie => <OpeningCard movie={movie} currentDay={currentDay} key={movie._id} />)}</div>
      : <div className="opening-empty"><span>No upcoming releases to announce yet.</span><Link to="/movies">Explore Movies <span aria-hidden="true">&#8250;</span></Link></div>}
  </div></section>;
}
