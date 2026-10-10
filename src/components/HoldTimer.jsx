import { useEffect, useRef, useState } from 'react';
import { formatCountdown, secondsLeft } from '../utils/payment';
import './payment.css';

// "Seats held for 4:32" with a bar that empties. Calls `onExpire` once when the time is up.
export default function HoldTimer({ expiresAt, onExpire }) {
  const [now, setNow] = useState(() => Date.now());
  const total = useRef(Math.max(1, secondsLeft(expiresAt)));
  const expired = useRef(false);
  const callback = useRef(onExpire);
  callback.current = onExpire;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const left = secondsLeft(expiresAt, now);
  useEffect(() => {
    if (left === 0 && !expired.current) {
      expired.current = true;
      callback.current?.();
    }
  }, [left]);

  return (
    <div className={`hold-timer${left <= 60 ? ' is-low' : ''}`} role="timer" aria-label="Time left to pay">
      <span className="hold-timer-text">Seats held for <b>{formatCountdown(left)}</b></span>
      <span className="hold-timer-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (left / total.current) * 100)}%` }} /></span>
    </div>
  );
}
