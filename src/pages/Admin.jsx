import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteDemoMovie, listMovies, saveDemoMovie } from '../data/catalog';
import { deleteDemoAuditorium, deleteDemoShowtime, listAuditoriums, listShowtimes, saveDemoAuditorium, saveDemoShowtime } from '../data/demoSchedule';
import { listDemoUsers, saveDemoUser, setDemoUserActive } from '../data/demoAuth';
import { canCancelDemoBooking, cancelDemoBooking, listDemoBookings } from '../data/demoBookings';

const blankMovie = { title: '', description: '', genre: ['Drama'], duration: 120, rating: 'PG-13', posterUrl: '/favicon.svg', backdropUrl: '/favicon.svg', director: '', cast: [], releaseDate: new Date().toISOString(), status: 'now_showing', price: 350 };

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [movieDraft, setMovieDraft] = useState(blankMovie);
  const [auditoriumDraft, setAuditoriumDraft] = useState({ name: '', capacity: 80 });
  const [showtimeDraft, setShowtimeDraft] = useState({ movieId: '', auditoriumId: '', time: '18:00' });
  const [userDraft, setUserDraft] = useState({ name: '', email: '', role: 'customer', password: '' });
  const movies = listMovies();
  const auditoriums = listAuditoriums();
  const showtimes = listShowtimes();
  const users = listDemoUsers();
  const bookings = listDemoBookings().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const refresh = () => setVersion(version + 1);
  const act = (action, message = 'Changes saved in this browser') => {
    try { action(); setError(''); setNotice(message); refresh(); }
    catch (err) { setError(err.message); setNotice(''); }
  };

  return (
    <div className="admin-page fade-in">
      <div className="admin-heading">
        <div><span className="home-section-eyebrow">FILME operations</span><h1>Admin dashboard</h1><p>Manage this browser’s sample cinema data.</p></div>
        <span className="admin-demo-badge">Frontend demo</span>
      </div>
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {['overview', 'movies', 'showtimes', 'auditoriums', 'users', 'bookings'].map((item) =>
          <button key={item} type="button" role="tab" aria-selected={tab === item} className={`filter-btn ${tab === item ? 'active' : ''}`} onClick={() => { setTab(item); setError(''); setNotice(''); }}>{item[0].toUpperCase() + item.slice(1)}</button>
        )}
      </div>
      {error && <div className="error-message" role="alert">{error}</div>}
      {notice && <div className="admin-notice" role="status">{notice}</div>}

      {tab === 'overview' && <>
        <div className="admin-stats">
          {[['Movies', movies.length], ['Daily showtimes', showtimes.length], ['Auditoriums', auditoriums.length], ['Users', users.length], ['Confirmed bookings', bookings.filter((booking) => booking.status === 'confirmed').length]].map(([label, value]) =>
            <div className="admin-stat" key={label}><strong>{value}</strong><span>{label}</span></div>
          )}
        </div>
        <div className="admin-panel"><h2>Recent bookings</h2>{bookings.length ? bookings.slice(0, 5).map((booking) => <p key={booking._id}>{listMovies().find((movie) => movie._id === booking.movieId)?.title || 'Removed movie'} · {booking.showDate} {booking.showTime} · {booking.status}</p>) : <p>No bookings yet. Use the customer account to place one.</p>}</div>
      </>}

      {tab === 'movies' && <>
        <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); act(() => { saveDemoMovie(movieDraft); setMovieDraft(blankMovie); }); }}>
          <h2>{movieDraft._id ? 'Edit movie' : 'Add movie'}</h2>
          <label>Title<input required value={movieDraft.title} onChange={(e) => setMovieDraft({ ...movieDraft, title: e.target.value })} /></label>
          <label>Description<textarea value={movieDraft.description} onChange={(e) => setMovieDraft({ ...movieDraft, description: e.target.value })} /></label>
          <label>Genre, comma separated<input value={movieDraft.genre.join(', ')} onChange={(e) => setMovieDraft({ ...movieDraft, genre: e.target.value.split(',').map((part) => part.trim()).filter(Boolean) })} /></label>
          <label>Director<input value={movieDraft.director} onChange={(e) => setMovieDraft({ ...movieDraft, director: e.target.value })} /></label>
          <label>Poster URL<input type="url" value={movieDraft.posterUrl} onChange={(e) => setMovieDraft({ ...movieDraft, posterUrl: e.target.value })} /></label>
          <label>Duration (minutes)<input type="number" min="1" value={movieDraft.duration} onChange={(e) => setMovieDraft({ ...movieDraft, duration: Number(e.target.value) })} /></label>
          <label>Ticket price (₱)<input type="number" min="1" value={movieDraft.price} onChange={(e) => setMovieDraft({ ...movieDraft, price: e.target.value })} /></label>
          <label>Status<select value={movieDraft.status} onChange={(e) => setMovieDraft({ ...movieDraft, status: e.target.value })}><option value="now_showing">Now showing</option><option value="coming_soon">Coming soon</option></select></label>
          <div className="admin-actions"><button className="btn btn-primary btn-small" type="submit">Save movie</button>{movieDraft._id && <button className="btn btn-secondary btn-small" type="button" onClick={() => setMovieDraft(blankMovie)}>Cancel edit</button>}</div>
        </form>
        <div className="admin-list">{movies.map((movie) => <div className="admin-row" key={movie._id}><div><strong>{movie.title}</strong><small>{movie.status.replace('_', ' ')} · ₱{movie.price}</small></div><div className="admin-actions"><Link className="btn btn-secondary btn-small" to={`/movie/${movie._id}`}>View</Link><button className="btn btn-secondary btn-small" onClick={() => setMovieDraft(movie)}>Edit</button><button className="btn btn-danger btn-small" onClick={() => act(() => { listShowtimes(movie._id).forEach((slot) => deleteDemoShowtime(slot.id)); deleteDemoMovie(movie._id); }, 'Movie removed')}>Remove</button></div></div>)}</div>
      </>}

      {tab === 'showtimes' && <>
        <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); act(() => { saveDemoShowtime(showtimeDraft); setShowtimeDraft({ movieId: '', auditoriumId: '', time: '18:00' }); }); }}>
          <h2>{showtimeDraft.id ? 'Edit daily showtime' : 'Add daily showtime'}</h2>
          <label>Movie<select required value={showtimeDraft.movieId} onChange={(e) => setShowtimeDraft({ ...showtimeDraft, movieId: e.target.value })}><option value="">Choose movie</option>{movies.filter((movie) => movie.status === 'now_showing').map((movie) => <option key={movie._id} value={movie._id}>{movie.title}</option>)}</select></label>
          <label>Auditorium<select required value={showtimeDraft.auditoriumId} onChange={(e) => setShowtimeDraft({ ...showtimeDraft, auditoriumId: e.target.value })}><option value="">Choose auditorium</option>{auditoriums.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Time<input required type="time" value={showtimeDraft.time} onChange={(e) => setShowtimeDraft({ ...showtimeDraft, time: e.target.value })} /></label>
          <div className="admin-actions"><button className="btn btn-primary btn-small">Save showtime</button>{showtimeDraft.id && <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowtimeDraft({ movieId: '', auditoriumId: '', time: '18:00' })}>Cancel edit</button>}</div>
        </form>
        <div className="admin-list">{showtimes.map((slot) => <div className="admin-row" key={slot.id}><div><strong>{movies.find((movie) => movie._id === slot.movieId)?.title || 'Removed movie'}</strong><small>{slot.time} daily · {auditoriums.find((item) => item.id === slot.auditoriumId)?.name || 'Removed auditorium'}</small></div><div className="admin-actions"><button className="btn btn-secondary btn-small" onClick={() => setShowtimeDraft(slot)}>Edit</button><button className="btn btn-danger btn-small" onClick={() => act(() => deleteDemoShowtime(slot.id), 'Showtime removed')}>Remove</button></div></div>)}</div>
      </>}

      {tab === 'auditoriums' && <>
        <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); act(() => { saveDemoAuditorium(auditoriumDraft); setAuditoriumDraft({ name: '', capacity: 80 }); }); }}>
          <h2>{auditoriumDraft.id ? 'Edit auditorium' : 'Add auditorium'}</h2>
          <label>Name<input required value={auditoriumDraft.name} onChange={(e) => setAuditoriumDraft({ ...auditoriumDraft, name: e.target.value })} /></label>
          <label>Capacity (up to 80 seats)<input required type="number" min="1" max="80" value={auditoriumDraft.capacity} onChange={(e) => setAuditoriumDraft({ ...auditoriumDraft, capacity: e.target.value })} /></label>
          <div className="admin-actions"><button className="btn btn-primary btn-small">Save auditorium</button>{auditoriumDraft.id && <button type="button" className="btn btn-secondary btn-small" onClick={() => setAuditoriumDraft({ name: '', capacity: 80 })}>Cancel edit</button>}</div>
        </form>
        <div className="admin-list">{auditoriums.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.name}</strong><small>{item.capacity} seats</small></div><div className="admin-actions"><button className="btn btn-secondary btn-small" onClick={() => setAuditoriumDraft(item)}>Edit</button><button className="btn btn-danger btn-small" onClick={() => act(() => deleteDemoAuditorium(item.id), 'Auditorium removed')}>Remove</button></div></div>)}</div>
      </>}

      {tab === 'users' && <>
        <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); act(() => { saveDemoUser(userDraft); setUserDraft({ name: '', email: '', role: 'customer', password: '' }); }); }}>
          <h2>{userDraft.id ? 'Edit user' : 'Add user'}</h2>
          <label>Name<input required value={userDraft.name} onChange={(e) => setUserDraft({ ...userDraft, name: e.target.value })} /></label>
          <label>Email<input required type="email" value={userDraft.email} onChange={(e) => setUserDraft({ ...userDraft, email: e.target.value })} /></label>
          <label>Role<select value={userDraft.role} onChange={(e) => setUserDraft({ ...userDraft, role: e.target.value })}><option value="customer">Customer</option><option value="admin">Admin</option></select></label>
          {!userDraft.id && <label>Demo password<input required type="password" minLength="6" value={userDraft.password} onChange={(e) => setUserDraft({ ...userDraft, password: e.target.value })} /></label>}
          <div className="admin-actions"><button className="btn btn-primary btn-small">Save user</button>{userDraft.id && <button type="button" className="btn btn-secondary btn-small" onClick={() => setUserDraft({ name: '', email: '', role: 'customer', password: '' })}>Cancel edit</button>}</div>
        </form>
        <div className="admin-list">{users.map((user) => <div className="admin-row" key={user.id}><div><strong>{user.name}</strong><small>{user.email} · {user.role} · {user.active ? 'active' : 'inactive'}</small></div>{!user.id.startsWith('demo-') && <div className="admin-actions"><button className="btn btn-secondary btn-small" onClick={() => setUserDraft(user)}>Edit</button><button className="btn btn-secondary btn-small" onClick={() => act(() => setDemoUserActive(user.id, !user.active))}>{user.active ? 'Disable' : 'Enable'}</button></div>}</div>)}</div>
      </>}

      {tab === 'bookings' && <div className="admin-list">{bookings.length === 0 && <div className="admin-panel">No bookings yet.</div>}{bookings.map((booking) => <div className="admin-row" key={booking._id}><div><strong>{movies.find((movie) => movie._id === booking.movieId)?.title || 'Removed movie'}</strong><small>{users.find((user) => user.id === booking.userId)?.email || 'Unknown user'} · {booking.showDate} {booking.showTime} · Seats {booking.seats.join(', ')} · ₱{booking.totalPrice} · {booking.status}</small></div>{canCancelDemoBooking(booking) && <button className="btn btn-danger btn-small" onClick={() => act(() => cancelDemoBooking(booking._id, booking.userId), 'Booking cancelled')}>Cancel</button>}</div>)}</div>}
    </div>
  );
}
