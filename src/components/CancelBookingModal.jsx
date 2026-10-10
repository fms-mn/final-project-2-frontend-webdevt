import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiCalendar, FiInfo } from 'react-icons/fi';
import { dayHeading, displayClock } from '../utils/manila';
import { getDemoBookingReference } from '../data/demoBookings';
import './CancelBookingModal.css';

export default function CancelBookingModal({ booking, pending = false, error, onKeep, onCancel }) {
  const dialogRef = useRef(null);
  const keepButtonRef = useRef(null);
  const [failedPoster, setFailedPoster] = useState(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (appRoot) appRoot.inert = true;
    keepButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onKeep();
      }
      if (event.key === 'Tab') {
        const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (!buttons.length) {
          event.preventDefault();
          dialogRef.current.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (appRoot) appRoot.inert = wasInert;
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onKeep]);

  const showtime = dayHeading(booking.showDate) + ' · ' + displayClock(booking.showTime);
  const poster = booking.movie?.posterUrl;

  return createPortal(
    <div className="booking-modal-overlay cancel-confirm-overlay">
      <section className="booking-modal booking-cancel-modal" role="dialog" aria-modal="true" aria-busy={pending} aria-labelledby="cancel-modal-title" aria-describedby="cancel-modal-explanation" tabIndex={-1} ref={dialogRef}>
        <span className="cancel-confirm-warning" aria-hidden="true"><FiAlertTriangle /></span>
        <h2 id="cancel-modal-title">Cancel this booking?</h2>
        <p className="cancel-confirm-reference"><span>Reference</span><code>{booking.bookingCode || getDemoBookingReference(booking)}</code></p>
        <div className="cancel-confirm-summary">
          {poster && poster !== failedPoster ? <img className="cancel-confirm-poster" src={poster} alt={`${booking.movie?.title || 'Movie'} poster`} onError={() => setFailedPoster(poster)} /> : <div className="cancel-confirm-poster cancel-confirm-poster-fallback" aria-label="Poster unavailable">FILME</div>}
        <dl className="cancel-confirm-details">
          <div><dt>Movie</dt><dd>{booking.movie?.title || 'Movie'}</dd></div>
          <div><dt><FiCalendar aria-hidden="true" />Showtime</dt><dd>{showtime}</dd></div>
          <div><dt><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 13V7a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v6M5 21v-7h14v7M8 21v-3m8 3v-3M3 10v6m18-6v6" /></svg>Seats</dt><dd className="cancel-confirm-seats">{booking.seats.map(seat => <span key={seat}>{seat}</span>)}</dd></div>
        </dl>
        </div>
        <p id="cancel-modal-explanation" className="cancel-confirm-explanation"><FiInfo aria-hidden="true" /><span>Your seats will become available again. This booking will remain in History as Cancelled.</span></p>
        {error && <p className="booking-submit-error" role="alert">{error}</p>}
        <div className="booking-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onKeep} disabled={pending} ref={keepButtonRef}>Keep Booking</button>
          <button type="button" className="btn btn-danger" onClick={onCancel} disabled={pending}>{pending ? 'Cancelling…' : 'Cancel Booking'}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
