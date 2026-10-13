import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FiCheck, FiX } from 'react-icons/fi';
import { displayClock, shortDate } from '../utils/manila';
import './bookingAuthPrompt.css';

export default function BookingAuthPrompt({ movieTitle, showing, onAuthenticate, onClose, backLabel, onBack }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog className="booking-auth-prompt" ref={dialog} aria-labelledby="booking-auth-title" aria-describedby="booking-auth-description" onCancel={event => { event.preventDefault(); onClose(); }}>
    <button className="booking-auth-close" type="button" onClick={onClose} aria-label="Close account prompt"><FiX aria-hidden="true" /></button>
    <div className="booking-auth-layout">
      <section className="booking-auth-story">
        <span className="booking-auth-eyebrow">Almost there</span>
        <h2 id="booking-auth-title">Create an account to book your seats</h2>
        <div className="booking-auth-selection" aria-live="polite">
          <strong>{movieTitle}</strong>
          <p>{showing ? `${shortDate(new Date(`${showing.date}T12:00:00+08:00`))} · ${displayClock(showing.time)} · ${showing.cinema}` : 'Choose your showing after exploring the movie.'}</p>
          {showing && <p>{showing.seats.length ? `Tentative seats: ${showing.seats.join(', ')}` : 'Seats not selected yet'}</p>}
        </div>
        <ul className="booking-auth-benefits"><li><FiCheck aria-hidden="true" />Keep your tickets in one place</li><li><FiCheck aria-hidden="true" />Get your booking confirmation</li></ul>
      </section>
      <section className="booking-auth-next" aria-label="Account options">
        <p className="booking-auth-intro">You need an account to book tickets. It only takes a minute.</p>
        <div className="booking-auth-actions"><Link className="booking-auth-create" to="/register" onClick={onAuthenticate}>Create account</Link><Link className="booking-auth-login" to="/login" onClick={onAuthenticate}>Log in</Link></div>
        <p className="booking-auth-context" id="booking-auth-description">Sign in to continue booking. We’ll keep your selected movie and showing.</p>
        <p className="booking-auth-disclaimer">Seat choices are tentative. No seats are held until you confirm a booking.</p>
        <button className="booking-auth-back" type="button" onClick={onBack}>{backLabel}</button>
      </section>
    </div>
  </dialog>, document.body);
}
