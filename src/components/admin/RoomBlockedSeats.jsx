import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../../api';
import { describeError } from '../../utils/adminTools';
import ChairShape from '../ChairShape';
import ActionPending from '../ActionPending';
import Feedback from './Feedback';
import './roomBlockedSeats.css';

export default function RoomBlockedSeats({ roomId, disabled, onDirtyChange, onSavingChange, onSaved }) {
  const [snapshot, setSnapshot] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const savingRef = useRef(false);
  const helperId = useId();
  const dirty = Boolean(snapshot && [...pending].sort().join('|') !== [...snapshot.auditorium.blockedSeats].sort().join('|'));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api(`/auditoriums/${roomId}/blocked-seats`, { signal: controller.signal })
      .then(data => { setSnapshot(data); setPending(data.auditorium.blockedSeats); })
      .catch(reason => { if (reason.name !== 'AbortError') setError(describeError(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [roomId, attempt]);

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const toggle = label => {
    setPending(current => current.includes(label) ? current.filter(seat => seat !== label) : [...current, label]);
    setNotice('');
  };
  const save = async () => {
    if (!dirty || savingRef.current || disabled) return;
    savingRef.current = true;
    setSaving(true);
    onSavingChange(true);
    setError('');
    setNotice('');
    try {
      const auditorium = await api(`/auditoriums/${roomId}/blocked-seats`, { method: 'PUT', body: { seats: pending } });
      setSnapshot(current => ({ ...current, auditorium }));
      setPending(auditorium.blockedSeats);
      onSaved(auditorium);
      setNotice(`Blocked seats saved for ${auditorium.name}.`);
    } catch (reason) {
      setError(describeError(reason));
      // Refresh protection after a booking races the save, without replacing the pending edit.
      try {
        const current = await api(`/auditoriums/${roomId}/blocked-seats`);
        setSnapshot(previous => ({ ...previous, protectedSeats: current.protectedSeats }));
      } catch { /* The save still revalidates against the server on the next attempt. */ }
    } finally {
      savingRef.current = false;
      setSaving(false);
      onSavingChange(false);
    }
  };

  const auditorium = snapshot?.auditorium;
  const newlyProtected = snapshot ? pending.filter(label => snapshot.protectedSeats.includes(label) && !auditorium.blockedSeats.includes(label)) : [];
  // Match the supported customer layout; auditorium records do not store custom aisles.
  const aisleAfter = auditorium?.seatsPerRow >= 6 && auditorium.seatsPerRow % 2 === 0 ? auditorium.seatsPerRow / 2 - 1 : -1;
  const rows = auditorium ? Array.from({ length: auditorium.rows }, (_, index) => auditorium.seatLabels.slice(index * auditorium.seatsPerRow, (index + 1) * auditorium.seatsPerRow)) : [];

  return <section className="blocked-editor room-blocked-editor" aria-label="Auditorium-wide blocked seats">
    <div><h3>Blocked seats{auditorium ? ` · ${auditorium.name}` : ''}</h3><p className="profile-help">Block seats across all showings in this auditorium. Changes take effect only when saved.</p></div>
    <Feedback error={error} notice={notice} noticeTitle="Blocked seats saved" onDismissNotice={() => setNotice('')} />
    {loading ? <p role="status">Loading auditorium seats…</p> : !auditorium ? <button type="button" className="btn btn-secondary btn-small" onClick={() => setAttempt(value => value + 1)}>Try again</button> : <>
      {newlyProtected.length > 0 && <div className="room-seat-conflict" role="status"><p>{newlyProtected.join(', ')} {newlyProtected.length === 1 ? 'is now protected and cannot' : 'are now protected and cannot'} be blocked. Your other changes are still pending.</p><button type="button" className="btn btn-secondary btn-small" disabled={saving || disabled} onClick={() => { setPending(current => current.filter(label => !newlyProtected.includes(label))); setError(''); }}>Remove protected seats from changes</button></div>}
      <p id={helperId} className="room-seat-help">Protected seats have a booking or active payment hold at an upcoming showing and cannot be changed here. Bookings and holds are checked again when you save.</p>
      <ul className="room-seat-legend" aria-label="Seat legend"><li><i className="available" aria-hidden="true" />Available</li><li><i className="blocked" aria-hidden="true">×</i>Blocked</li><li><i className="protected" aria-hidden="true">◆</i>Protected</li></ul>
      <div className="room-seat-scroll" tabIndex={0} role="region" aria-label={`${auditorium.name} seat map; scroll horizontally to see all seats`} aria-describedby={helperId}>
        <div className="room-seat-layout">
          <div className="room-seat-screen" aria-hidden="true"><span>SCREEN</span></div>
          <div className="room-seat-rows" role="group" aria-label={`${auditorium.name} seats`}>{rows.map((seats, row) => {
            const rowName = seats[0]?.match(/^[A-Z]+/)?.[0];
            return <div className="room-seat-row" key={rowName}>
              <span className="room-seat-row-name" aria-hidden="true">{rowName}</span>
              {seats.map((label, index) => {
                const blocked = pending.includes(label);
                const protectedSeat = snapshot.protectedSeats.includes(label);
                const status = protectedSeat ? 'protected by a booking or active hold' : blocked ? 'blocked — unblock seat' : 'available — block seat';
                return <button type="button" key={label} className={`room-seat-chair${blocked ? ' is-blocked' : ''}${protectedSeat ? ' is-protected' : ''}${index === aisleAfter ? ' has-aisle' : ''}`}
                  aria-label={`Seat ${label}, ${status}`} aria-pressed={blocked} aria-describedby={protectedSeat ? helperId : undefined}
                  disabled={disabled || saving || protectedSeat} onClick={() => toggle(label)} title={`Seat ${label}, ${status}`}>
                  <ChairShape label={label.slice(rowName.length)} />
                  {(blocked || protectedSeat) && <span className="room-seat-mark" aria-hidden="true">{protectedSeat ? '◆' : '×'}</span>}
                </button>;
              })}
              <span className="room-seat-row-name" aria-hidden="true">{rowName}</span>
            </div>;
          })}</div>
        </div>
      </div>
      <p className="room-seat-scroll-hint">Scroll sideways if the full row is not visible.</p>
      <div className="room-blocked-summary" aria-live="polite"><strong>{pending.length} {pending.length === 1 ? 'seat' : 'seats'} blocked{dirty ? ' · Unsaved changes' : ''}</strong><p>{pending.length ? auditorium.seatLabels.filter(label => pending.includes(label)).join(', ') : 'No blocked seats.'}</p></div>
      <div className="admin-actions"><button type="button" className="btn btn-primary btn-small" disabled={disabled || saving || !dirty || newlyProtected.length > 0} aria-busy={saving} onClick={save}><ActionPending pending={saving}>{saving ? 'Saving...' : 'Save blocked seats'}</ActionPending></button></div>
    </>}
  </section>;
}
