import { Link } from 'react-router-dom';
import { clearPendingBooking, readPendingBooking } from '../utils/pendingBooking';

export default function PendingBookingNotice() {
  const pending = readPendingBooking();
  if (!pending) return null;
  return <div className="auth-booking-notice" role="status">
    <p>{pending.showtimeId ? 'Sign in to continue booking. We’ll keep your selected movie and showing.' : 'Sign in to continue booking. We’ll keep your selected movie.'}</p>
    <p>Your seat choices are tentative and will be checked again. No seats are held.</p>
    <Link to="/" onClick={() => clearPendingBooking()}>Abandon booking and browse movies</Link>
  </div>;
}
