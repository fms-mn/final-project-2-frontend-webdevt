import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isBookableShowing } from '../utils/showtimesBoard';
import { displayClock } from '../utils/manila';
import './showtimeBoard.css';

export default function ShowtimeBoard({ groups, dateLabel, showingLink, role }) {
  return <div className="movie-showing-grid">{groups.map(group => <MovieScheduleCard key={group.movie._id + ':' + dateLabel} {...group} dateLabel={dateLabel} showingLink={showingLink} role={role} />)}</div>;
}

function MovieScheduleCard({ movie, showings, dateLabel, showingLink, role }) {
  const [expanded, setExpanded] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const ticketsId = useId();
  const moreRef = useRef(null);
  const fewerRef = useRef(null);
  const expansionChanged = useRef(false);
  useEffect(() => {
    if (expansionChanged.current) (expanded ? fewerRef : moreRef).current?.focus();
  }, [expanded]);
  const toggleExpanded = () => { expansionChanged.current = true; setExpanded(value => !value); };
  const overflow = showings.length > 8;
  const visibleShowings = overflow && !expanded ? showings.slice(0, 7) : showings;
  const layout = showings.length === 1 ? 'single' : showings.length <= 3 ? 'spacious' : showings.length <= 6 ? 'compact' : 'packed';
  return <article className={'movie-showing-card schedule-' + layout} style={{ '--ticket-columns': Math.min(showings.length, 3) }}>
    <div className="movie-showing-heading">
      <div className="board-poster">{movie.posterUrl && !posterFailed ? <img src={movie.posterUrl} alt="" loading="lazy" onError={() => setPosterFailed(true)} /> : <span>FILME</span>}</div>
      <div className="board-movie-copy"><h3>{movie.title}</h3><div className="board-movie-tags">{movie.rating && <span className="board-rating">{movie.rating}</span>}{movie.duration && <span>{movie.duration} min</span>}{movie.genre.map(genre => <span key={genre}>{genre}</span>)}</div>{(movie.description || movie.synopsis) && <p className="board-synopsis">{movie.description || movie.synopsis}</p>}
        <Link className="board-details" to={'/movie/' + movie._id + '?details=1'} aria-label={'More details about ' + movie.title}>More details <span aria-hidden="true">→</span></Link>
        {showings[0]?.language && <p className="board-movie-meta">{showings[0].language}{showings[0].subtitles ? ' · Subtitles: ' + showings[0].subtitles : ''}</p>}
      </div>
    </div>
    <div className="board-showtime-chips" id={ticketsId} role="group" aria-label={movie.title + ' showings'}>{visibleShowings.map(row => {
      const available = isBookableShowing(row);
      const status = row.status === 'FEW SEATS' ? 'Limited availability' : row.status === 'OPEN' ? 'Available' : row.status.toLowerCase();
      const label = movie.title + ', ' + dateLabel + ', ' + displayClock(row.time) + ', ' + row.room + ': ' + status + ', ' + row.seats + ' seats left';
      const [clock, period] = displayClock(row.time).split(' ');
      const content = <><div className="board-ticket-main"><span className="board-ticket-room">{row.room}{row.format ? ' · ' + row.format : ''}</span><strong>{clock} <small>{period}</small></strong><span className={'board-ticket-status' + (row.status === 'FEW SEATS' ? ' is-limited' : '')}><i aria-hidden="true" />{row.status === 'OPEN' ? `${row.seats} seats left` : `${status} · ${row.seats} seats left`}</span></div><div className="board-ticket-bottom">{row.price != null && <span className="board-ticket-price"><b>₱{row.price.toLocaleString('en-PH')}</b><small>per seat</small></span>}<span className="board-ticket-book" aria-hidden="true">{available ? role === 'user' ? 'Book' : 'Preview' : 'Unavailable'}</span></div></>;
      const className = 'board-showtime-chip' + (available ? ' is-available' : ' is-unavailable');
      return available && role !== 'admin' ? <Link key={row.id} className={className} aria-label={'Choose ' + label} to={showingLink(row)}>{content}</Link>
        : <button key={row.id} type="button" className={className} disabled aria-label={label + (role === 'admin' ? '. Admin preview; booking disabled' : '')}>{content}</button>;
    })}{overflow && !expanded && <button ref={moreRef} type="button" className="board-showtime-more" aria-expanded={false} aria-controls={ticketsId} aria-label={`Show ${showings.length - visibleShowings.length} more showtimes for ${movie.title}`} onClick={toggleExpanded}><strong>+{showings.length - visibleShowings.length} more</strong><span>Show all showtimes <span aria-hidden="true">⌄</span></span></button>}</div>
    {overflow && expanded && <button ref={fewerRef} type="button" className="board-showtime-fewer" aria-expanded={true} aria-controls={ticketsId} aria-label={'Show fewer showtimes for ' + movie.title} onClick={toggleExpanded}>Show fewer <span aria-hidden="true">⌃</span></button>}
  </article>;
}
