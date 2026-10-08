import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiCheck } from 'react-icons/fi';
import { calendarReminder, daysUntilOpening, openingDate } from '../utils/openingSoon';

function OpeningCard({ movie, currentDay }) {
  const [downloaded, setDownloaded] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const day = openingDate(movie);
  const date = day ? new Date(`${day}T12:00:00+08:00`) : null;
  const daysLeft = day ? daysUntilOpening(day, currentDay) : null;
  const downloadReminder = () => {
    const file = new Blob([calendarReminder(movie, day)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `filme-${movie._id}-opening.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  };

  return <article className="opening-card">
    <Link className="opening-poster" to={`/movie/${movie._id}`} aria-label={`Preview ${movie.title}`}>
      {movie.posterUrl && !posterFailed && <img src={movie.posterUrl} alt="" onError={() => setPosterFailed(true)} />}
      {(!movie.posterUrl || posterFailed) && <span>POSTER</span>}
    </Link>
    <div className="opening-card-body">
      <div className="opening-date-line"><span className="opening-date-pill">{date ? date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).toUpperCase() : 'TBA'}</span><span className="opening-countdown">{daysLeft === null ? 'DATE TO BE ANNOUNCED' : daysLeft === 0 ? 'OPENS TODAY' : `IN ${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'}`}</span></div>
      <Link className="opening-title" to={`/movie/${movie._id}`}>{movie.title}</Link>
      <p className="opening-details">{movie.genre.join(' · ')} · {movie.duration} min</p>
      <div className="opening-card-footer"><span className="opening-rating">{movie.rating}</span><button type="button" className="opening-remind" onClick={downloadReminder} disabled={!day} aria-label={`Download a calendar reminder for ${movie.title}`} title="Download a calendar reminder">{downloaded ? <FiCheck aria-hidden="true" /> : <FiBell aria-hidden="true" />}{downloaded ? 'Downloaded' : 'Remind me'}</button></div>
    </div>
  </article>;
}

export default function OpeningSoon({ movies, currentDay }) {
  return <section className="opening-section" aria-labelledby="opening-heading"><div className="opening-section-inner">
    <div className="opening-heading"><span className="opening-eyebrow">Mark your calendar</span><h2 id="opening-heading">Opening soon</h2></div>
    {movies.length ? <div className="opening-grid">{movies.map(movie => <OpeningCard movie={movie} currentDay={currentDay} key={movie._id} />)}</div> : <p className="opening-empty">More films are on their way.</p>}
  </div></section>;
}
