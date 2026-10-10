import { Link } from 'react-router-dom';
import { isBookableShowing } from '../utils/showtimesBoard';
import { displayClock } from '../utils/manila';

export default function ShowtimeBoard({ groups, dateLabel, showingLink, role, selectedMovieId, onMovieChange }) {
  return <div className="movie-showing-grid">{groups.map(({ movie, showings }) => <article className={'movie-showing-card' + (selectedMovieId === movie._id ? ' is-selected' : '')} key={movie._id}>
    <div className="movie-showing-heading">
      <button type="button" className="board-poster" onClick={() => onMovieChange(movie._id)} aria-label={'Preview ' + movie.title + ' in the hero'}><img src={movie.posterUrl} alt="" loading="lazy" /></button>
      <div><h3>{movie.title}</h3><p className="board-movie-meta">{movie.rating} · {movie.duration} min · {movie.genre.join(' / ')}</p><p className="board-synopsis">{movie.description}</p>
        <button type="button" className="board-preview" onClick={() => onMovieChange(movie._id)} aria-pressed={selectedMovieId === movie._id}>Preview movie</button>
        <Link className="board-details" to={'/movie/' + movie._id + '?details=1'}>More details</Link>
      </div>
    </div>
    <div className="board-showtime-chips" role="group" aria-label={movie.title + ' showings'}>{showings.map(row => {
      const available = isBookableShowing(row);
      const status = row.status === 'FEW SEATS' ? 'Limited availability' : row.status === 'OPEN' ? 'Available' : row.status.toLowerCase();
      const label = movie.title + ', ' + dateLabel + ', ' + displayClock(row.time) + ', ' + row.room + ': ' + status + ', ' + row.seats + ' seats left';
      const content = <><strong>{displayClock(row.time)}</strong><span>{row.room}{row.format ? ' · ' + row.format : ''}</span><span>{status} · {row.seats} seats left</span>{row.price != null && <span>₱{row.price.toLocaleString('en-PH')} / seat</span>}</>;
      return available && role === 'user' ? <Link key={row.id} className="board-showtime-chip" aria-label={'Book ' + label} to={showingLink(row)} onClick={() => onMovieChange(movie._id)}>{content}</Link>
        : <button key={row.id} type="button" className="board-showtime-chip" disabled aria-label={label + (role === 'admin' ? '. Admin preview; booking disabled' : '')}>{content}</button>;
    })}</div>
    {showings[0]?.language && <p className="board-movie-meta">{showings[0].language}{showings[0].subtitles ? ' · Subtitles: ' + showings[0].subtitles : ''}</p>}
  </article>)}</div>;
}
