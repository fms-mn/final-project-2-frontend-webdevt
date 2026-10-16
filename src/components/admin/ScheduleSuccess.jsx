import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { manilaClock, shortDate } from '../../utils/manila';
import './scheduleSuccess.css';

export default function ScheduleSuccess({ result, movies, rooms, onClose, onAnother, onView }) {
  const dialog = useRef(null);
  const firstAction = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const count = result.created.length;
  const skipped = result.skipped;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const element = dialog.current;
    document.body.style.overflow = 'hidden';
    element.showModal();
    firstAction.current.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const movieTitle = showing => showing.movie?.title || movies.find(movie => movie._id === (showing.movie?._id || showing.movie))?.title;
  const roomName = showing => showing.auditorium?.name || rooms.find(room => room._id === (showing.auditorium?._id || showing.auditorium))?.name;

  return createPortal(<dialog ref={dialog} className="schedule-success" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <button className="schedule-success-close" type="button" aria-label="Close scheduling confirmation" onClick={onClose}>×</button>
    <span className="schedule-success-check" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" /><path d="m9 16 5 5 9-11" /></svg></span>
    <h2 id={titleId}>{count === 1 ? 'Showing scheduled' : `${count} showings scheduled`}</h2>
    <p id={descriptionId}>{count === 1 ? 'Your showing was saved successfully.' : 'Your showings were saved successfully.'}{skipped.length > 0 && ` ${skipped.length} ${skipped.length === 1 ? 'showing was' : 'showings were'} skipped and not saved.`}</p>
    <div className="schedule-success-summary" tabIndex={0} role="region" aria-label="Scheduling results">
      <ul className="schedule-success-saved" aria-label="Saved showings">{result.created.map(showing => <li key={showing._id}>
        <span><strong>{movieTitle(showing)}</strong><span> · {shortDate(showing.startTime)} · {manilaClock(showing.startTime)}</span></span>
        <span className="schedule-success-room">{roomName(showing)}</span>
      </li>)}</ul>
      {skipped.length > 0 && <div className="schedule-success-skipped"><h3>Not saved</h3><ul>{skipped.map((showing, index) => <li key={`${showing.startTime}:${index}`}><strong>{showing.label}</strong>: {showing.reason}</li>)}</ul></div>}
    </div>
    <div className="schedule-success-actions">
      <button ref={firstAction} type="button" className="schedule-success-another" onClick={onAnother}>Schedule another</button>
      <button type="button" className="schedule-success-view" onClick={onView}>View schedule</button>
    </div>
  </dialog>, document.body);
}
