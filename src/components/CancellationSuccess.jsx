import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import './CancellationSuccess.css';

const SEQUENCE_MS = 8000;

export default function CancellationSuccess({ reference, onDismiss }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [closing, setClosing] = useState(false);
  const remaining = useRef(SEQUENCE_MS);
  const paused = hovered || focused || hidden;

  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (paused || closing) return;
    const started = performance.now();
    const timer = window.setTimeout(onDismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [paused, closing, onDismiss]);

  useEffect(() => {
    if (!closing) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(onDismiss, reduced ? 0 : 200);
    return () => window.clearTimeout(timer);
  }, [closing, onDismiss]);

  const items = [
    ['Booking cancelled', reference],
    ['Seats released', 'Available to book again.'],
    ['Moved to History', 'View your cancelled booking.'],
  ];

  return createPortal(
    <div className="cancellation-success-position">
      <section className={`cancellation-success${closing ? ' is-closing' : ''}`} aria-label="Cancellation complete" data-paused={paused}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        <span className="cancellation-success-announcement" role="status" aria-live="polite" aria-atomic="true">
          Booking {reference} cancelled. Seats released and available to book again. Your cancelled booking is in History.
        </span>
        <div className="cancellation-success-items" aria-hidden="true">
          {items.map(([heading, text], index) => (
            <div className={`cancellation-success-item item-${index + 1}`} key={heading}>
              <svg aria-hidden="true" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle className="cancellation-success-ring" cx="14" cy="14" r="12" />
                <path className="cancellation-success-tick" d="M8.5 14.5l4 4 7-8" />
              </svg>
              <div><strong>{heading}</strong><p className={index === 0 ? 'cancellation-success-reference' : undefined}>{text}</p></div>
            </div>
          ))}
        </div>
        <button type="button" className="cancellation-success-dismiss" aria-label="Dismiss cancellation success" onClick={() => setClosing(true)}><FiX aria-hidden="true" /></button>
        <span className="cancellation-success-countdown" aria-hidden="true" />
      </section>
    </div>,
    document.body,
  );
}
