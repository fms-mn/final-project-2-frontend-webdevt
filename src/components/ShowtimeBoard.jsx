import { Link } from 'react-router-dom';
import { isBookableShowing } from '../utils/showtimesBoard';

function FilmShowing({ row, dateLabel, showingLink }) {
  const available = isBookableShowing(row);
  const status = row.status === 'FEW SEATS' ? 'Few seats' : row.status === 'SOLD OUT' ? 'Sold out' : row.status === 'STARTED' ? 'Started' : row.status === 'CANCELLED' ? 'Cancelled' : 'Open';
  const label = `${row.movie.title}, ${dateLabel}, ${row.time}, ${row.room}: ${available ? `${row.seats} seats left. Book now` : status}`;
  return <article className="board-film-option">
    <h4>{row.movie.title}</h4>
    <p className="board-film-room">{row.room}</p>
    <p className={`board-film-availability ${available ? '' : 'is-unavailable'}`}>{row.seats} {row.seats === 1 ? 'seat' : 'seats'} left · {status}</p>
    {available ? <Link className="board-book" to={showingLink(row)} aria-label={label}>Book now</Link> : <button type="button" className="board-book" aria-label={label} disabled>{status}</button>}
  </article>;
}

export default function ShowtimeBoard({ groups, dateLabel, showingLink }) {
  return <div className="showtime-board">{groups.map(group => <div className="board-time-group" key={group.time}>
    <h3 className="board-digital-time">{group.time}</h3>
    <div className="board-film-list">{group.showings.map(row => <FilmShowing key={row.id} row={row} dateLabel={dateLabel} showingLink={showingLink} />)}</div>
  </div>)}</div>;
}
