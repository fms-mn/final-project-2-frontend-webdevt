import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiBell, FiCheck } from 'react-icons/fi';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { daysUntilOpening, openingDate } from '../utils/openingSoon';
import './openingSoon.css';

function OpeningCard({ movie, currentDay, reminding, busy, note, onRemind }) {
  const [posterFailed, setPosterFailed] = useState(false);
  const day = openingDate(movie);
  const date = day ? new Date(`${day}T12:00:00+08:00`) : null;
  const daysLeft = day ? daysUntilOpening(day, currentDay) : null;

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
    <div className="opening-calendar-action">
      <button type="button" className={`opening-remind${reminding ? ' is-on' : ''}`} disabled={!day || busy} aria-pressed={reminding} aria-busy={busy}
        aria-label={reminding ? `Stop email reminder for ${movie.title}` : `Email me a reminder before ${movie.title} opens`} onClick={() => onRemind(movie)}>
        {reminding ? <FiCheck aria-hidden="true" /> : <FiBell aria-hidden="true" />}{busy ? 'Saving…' : reminding ? 'Reminder on' : 'Remind me by email'}
      </button>
      <span className="opening-calendar-hint" role="status">{note || (day ? (reminding ? 'We’ll email you the day before it opens. Tap to turn it off.' : 'We’ll email you the day before it opens.') : 'Release date to be announced.')}</span>
    </div>
  </article>;
}

export default function OpeningSoon({ movies, currentDay, loading = false, error = '', onRetry }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canRemind = user?.role === 'user' && !user.isDemo;
  const [reminding, setReminding] = useState(() => new Set());
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState({ id: '', text: '' });

  useEffect(() => {
    if (!canRemind) { setReminding(new Set()); return undefined; }
    const controller = new AbortController();
    api('/reminders', { signal: controller.signal }).then((data) => setReminding(new Set(data.movieIds))).catch(() => {});
    return () => controller.abort();
  }, [canRemind]);

  const toggle = useCallback(async (movie) => {
    setMessage({ id: '', text: '' });
    if (!user) { navigate('/login', { state: { from: { pathname: '/' } } }); return; }
    if (!canRemind) { setMessage({ id: movie._id, text: user.isDemo ? 'Email reminders are not sent in demo mode.' : 'Email reminders are for customer accounts.' }); return; }
    const turnOn = !reminding.has(movie._id);
    setBusyId(movie._id);
    try {
      await api(`/reminders/${movie._id}`, { method: turnOn ? 'PUT' : 'DELETE' });
      setReminding((current) => { const next = new Set(current); if (turnOn) next.add(movie._id); else next.delete(movie._id); return next; });
    } catch (err) {
      setMessage({ id: movie._id, text: err.message || 'Could not save your reminder. Please try again.' });
    } finally {
      setBusyId('');
    }
  }, [user, canRemind, reminding, navigate]);

  return <section className="opening-section" aria-labelledby="opening-heading"><div className="opening-section-inner">
    <div className="opening-heading"><span className="opening-eyebrow">Get a reminder</span><h2 id="opening-heading">Coming soon</h2></div>
    {loading ? <div className="loading" role="status" aria-label="Loading upcoming releases"><div className="spinner" aria-hidden="true" /></div>
      : error ? <div className="opening-error" role="alert"><p>{error}</p><button type="button" className="btn btn-primary" onClick={onRetry}>Try again</button></div>
      : movies.length ? <div className="opening-grid">{movies.map(movie => <OpeningCard movie={movie} currentDay={currentDay} key={movie._id} reminding={reminding.has(movie._id)} busy={busyId === movie._id}
        note={message.id === movie._id ? message.text : !user ? 'Sign in to get an email before it opens.' : ''} onRemind={toggle} />)}</div>
      : <div className="opening-empty"><span>No upcoming releases to announce yet.</span><Link to="/movies">Explore Movies <span aria-hidden="true">&#8250;</span></Link></div>}
  </div></section>;
}
