import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDemoBookingReference } from '../data/demoBookings';
import { listAuditoriums } from '../data/demoSchedule';

export default function BookingConfirmationModal({ draft, booking, pending, error, onConfirm, onClose, onViewBookings, returnFocusRef }) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const feedbackTimer = useRef(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    const previousFocus = document.activeElement;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert;
    const previousOverflow = document.body.style.overflow;
    const previousPageOverflow = document.documentElement.style.overflow;
    if (appRoot) appRoot.inert = true;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!dialogRef.current?.querySelector('.confirmation-submit:disabled')) onClose();
      }
      if (event.key === 'Tab') {
        const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (appRoot) appRoot.inert = wasInert;
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousPageOverflow;
      clearTimeout(feedbackTimer.current);
      if (previousFocus?.isConnected && previousFocus !== document.body && previousFocus !== document.documentElement && previousFocus.getClientRects().length) previousFocus.focus({ preventScroll: true });
      else returnFocusRef?.current?.focus({ preventScroll: true });
    };
  }, [onClose, returnFocusRef]);

  useEffect(() => {
    if (booking) headingRef.current?.focus({ preventScroll: true });
  }, [booking]);

  const when = booking?.showtime?.startTime ? new Date(booking.showtime.startTime) : new Date(`${booking?.showDate || draft.showDate}T${booking?.showTime || draft.showTime}:00`);
  const showDate = when.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' });
  const showTime = booking?.showtime?.startTime ? when.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false }) : booking?.showTime || draft.showTime;
  const seats = booking?.seats || draft.seats;
  const code = booking && (booking.bookingCode || getDemoBookingReference(booking));
  const auditoriumName = booking ? booking.auditorium?.name || listAuditoriums().find((room) => room.id === booking.auditoriumId)?.name || 'Cinema' : draft.auditoriumName;
  const price = booking ? (booking.totalAmount != null ? booking.totalAmount / 100 : booking.totalPrice) : draft.totalPrice;
  const unitPrice = booking ? (booking.unitPrice != null ? booking.unitPrice / 100 : price / seats.length) : draft.unitPrice;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedback('Copied!');
    } catch {
      setCopyFeedback('Could not copy. Select the code above.');
    }
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setCopyFeedback(''), 2500);
  };

  return createPortal(
    <div className="booking-modal-overlay confirmation-overlay">
      <section className="booking-modal confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" aria-describedby="booking-modal-reference" ref={dialogRef} tabIndex={-1}>
        <header className="confirmation-modal-header">
          <span className="booking-eyebrow">{booking ? 'Your ticket' : 'Final step'}</span>
          <button type="button" className="confirmation-close" aria-label={booking ? 'Close ticket' : 'Close confirmation'} onClick={onClose} disabled={pending}>×</button>
          <h2 id="booking-modal-title" ref={headingRef} tabIndex={-1}>{booking ? 'Booking confirmed' : 'Confirm your booking'}</h2>
          <p id="booking-modal-reference" className="booking-modal-reference">{booking ? 'Show this code at the cinema. Your ticket is also in My tickets.' : 'Review your seats and total before confirming.'}</p>
        </header>
        <div className="confirmation-modal-content">
        <div className={`confirmation-ticket ${booking ? 'is-confirmed' : 'is-review'}`}>
          <div className="confirmation-main">
            <div className="confirmation-brand"><img src="/filme-mark.svg" alt="" /> FILME <span>ADMIT {seats.length}</span></div>
            <h3>{booking?.movie?.title || draft.movieTitle}</h3>
            <dl><div><dt>Date</dt><dd>{showDate}</dd></div><div><dt>Time</dt><dd>{showTime}</dd></div><div><dt>Cinema</dt><dd>{auditoriumName}</dd></div><div><dt>Seats</dt><dd>{seats.join(' · ')}</dd></div></dl>
          </div>
          {booking ? <div className="confirmation-stub">
            <small>Booking code</small>
            <strong>{code}</strong>
            <button type="button" className="confirmation-copy" onClick={copyCode}>Copy code</button>
            <span className="confirmation-copy-feedback" role="status" aria-live="polite">{copyFeedback}</span>
            <div className="ticket-bars" aria-hidden="true"/>
            <div className="confirmation-price"><span>{seats.length} × ₱{unitPrice.toLocaleString('en-PH')}</span><b>₱{price.toLocaleString('en-PH')}</b></div>
          </div> : <div className="confirmation-stub confirmation-review-stub">
            <small>Price breakdown</small>
            <span className="confirmation-review-unit">{seats.length} {seats.length === 1 ? 'ticket' : 'tickets'} × ₱{unitPrice.toLocaleString('en-PH')}</span>
            <div className="confirmation-price"><span>Total</span><b>₱{price.toLocaleString('en-PH')}</b></div>
          </div>}
        </div>
        </div>
        <footer className="booking-modal-actions confirmation-modal-actions">
          {!booking && error && <p className="confirmation-error" role="alert">{error}</p>}
          {booking ? <>
            <button type="button" className="btn btn-dark" onClick={onViewBookings}>Go to My tickets</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </> : <>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={pending}>Back to seats</button>
            <button type="button" className="btn btn-primary confirmation-submit" onClick={onConfirm} disabled={pending} aria-busy={pending}>{pending ? 'Processing...' : 'Confirm Booking'}</button>
          </>}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
