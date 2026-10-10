import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDemoBookingReference } from '../data/demoBookings';
import { displayTime, shortDate } from '../utils/manila';
import { listAuditoriums } from '../data/demoSchedule';
import { describePayment } from '../utils/payment';
import HoldTimer from './HoldTimer';
import PaymentPanel from './PaymentPanel';

// `payment` (live bookings only) switches the dialog to its payment step: { hold, walletPayment, pending, error,
// onPay, onAuthorize, onRelease, onExpire }. The seats are held until `hold.holdExpiresAt`.
export default function BookingConfirmationModal({ draft, booking, pending, error, payment, onConfirm, onClose, onViewBookings, returnFocusRef }) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const feedbackTimer = useRef(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [celebrationKey, setCelebrationKey] = useState(null);
  const celebratedBookings = useRef(new Set());
  const previousBookingKey = useRef(booking?._id || booking?.bookingCode || null);
  const bookingKey = booking?._id || booking?.bookingCode || null;

  useLayoutEffect(() => {
    if (!bookingKey) setCelebrationKey(null);
    if (bookingKey && bookingKey !== previousBookingKey.current && !celebratedBookings.current.has(bookingKey)) {
      celebratedBookings.current.add(bookingKey);
      setCelebrationKey(bookingKey);
    }
    previousBookingKey.current = bookingKey;
  }, [bookingKey]);

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

  const when = booking?.showtime?.startTime ? new Date(booking.showtime.startTime) : new Date(`${booking?.showDate || draft.showDate}T${booking?.showTime || draft.showTime}:00+08:00`);
  const showDate = shortDate(when);
  const showTime = displayTime(when);
  const simulated = draft.isDemo || booking?.isDemo;
  const paying = Boolean(payment && !booking);
  const seats = booking?.seats || draft.seats;
  const code = booking && (booking.bookingCode || getDemoBookingReference(booking));
  const auditoriumName = booking ? booking.auditorium?.name || listAuditoriums().find((room) => room.id === booking.auditoriumId)?.name || 'Cinema' : draft.auditoriumName;
  const price = booking ? (booking.totalAmount != null ? booking.totalAmount / 100 : booking.totalPrice) : paying ? payment.hold.totalAmount / 100 : draft.totalPrice;
  const unitPrice = booking ? (booking.unitPrice != null ? booking.unitPrice / 100 : price / seats.length) : paying ? payment.hold.unitPrice / 100 : draft.unitPrice;

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
        <header className={`confirmation-modal-header ${booking ? 'is-confirmed' : ''}`}>
          {booking ? <span className={`confirmation-success-indicator ${celebrationKey === bookingKey ? 'is-celebrating' : ''}`} aria-hidden="true">
            <span className="confirmation-success-circle"><svg viewBox="0 0 48 48" fill="none"><path d="M11 24.5 20 33 37 15" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            {celebrationKey === bookingKey && <span className="confirmation-confetti">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</span>}
          </span> : <span className="booking-eyebrow">Final step</span>}
          <button type="button" className="confirmation-close" aria-label={booking ? 'Close ticket' : 'Close confirmation'} onClick={onClose} disabled={pending}>×</button>
          <h2 id="booking-modal-title" ref={headingRef} tabIndex={-1}>{simulated ? booking ? 'Demo booking saved' : 'Confirm simulated booking' : booking ? 'Booking confirmed' : paying ? 'Pay for your tickets' : 'Confirm your booking'}</h2>
          <p id="booking-modal-reference" className="booking-modal-reference">{simulated ? 'This booking is simulated. No payment is taken and this code is not valid for cinema admission.' : booking ? (booking.payment ? 'Payment received. Your booking is confirmed and saved in My tickets. Show the code below at the cinema.' : 'Your booking is confirmed and saved in My tickets. Show the code below at the cinema.') : paying ? 'Your seats are reserved for you while you pay.' : 'Review your seats and total before confirming.'}</p>
        </header>
        <div className="confirmation-modal-content">
        <div className={`confirmation-ticket ${booking ? 'is-confirmed' : 'is-review'} ${booking && celebrationKey === bookingKey ? 'is-celebrating' : ''}`}>
          <div className="confirmation-main">
            <div className="confirmation-brand"><img src="/filme-mark.svg" alt="" /> FILME <span>{simulated ? 'DEMO · ' : 'ADMIT '}{seats.length}</span></div>
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
            {booking.payment && <span className="confirmation-paid">Paid · {describePayment(booking.payment)}<br />{booking.payment.reference}</span>}
          </div> : <div className="confirmation-stub confirmation-review-stub">
            <small>Price breakdown</small>
            <span className="confirmation-review-unit">{seats.length} {seats.length === 1 ? 'ticket' : 'tickets'} × ₱{unitPrice.toLocaleString('en-PH')}</span>
            <div className="confirmation-price"><span>Total</span><b>₱{price.toLocaleString('en-PH')}</b></div>
          </div>}
        </div>
        {paying && <>
          <HoldTimer expiresAt={payment.hold.holdExpiresAt} onExpire={payment.onExpire} />
          <PaymentPanel
            formId="payment-form" total={price} pending={payment.pending} error={payment.error}
            walletPayment={payment.walletPayment} onPay={payment.onPay} onAuthorize={payment.onAuthorize}
          />
        </>}
        </div>
        <footer className="booking-modal-actions confirmation-modal-actions">
          {!booking && !paying && error && <p className="confirmation-error" role="alert">{error}</p>}
          {paying ? <>
            <button type="button" className="btn btn-secondary" onClick={payment.onRelease} disabled={payment.pending}>Back to seats</button>
            {!payment.walletPayment && <button type="submit" form="payment-form" className="btn btn-primary confirmation-submit" disabled={payment.pending} aria-busy={payment.pending}>{payment.pending ? 'Processing...' : `Pay ₱${price.toLocaleString('en-PH')}`}</button>}
          </> : booking ? <>
            <button type="button" className="btn btn-primary" onClick={onViewBookings}>Go to My tickets</button>
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
