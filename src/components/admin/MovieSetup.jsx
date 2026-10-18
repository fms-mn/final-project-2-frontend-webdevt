import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import DatePicker from '../DatePicker';
import { dateProblem, validDay } from '../../utils/calendar';
import { describeError } from '../../utils/adminTools';
import { displayTime, manilaDay, shiftDay, shortDate, today } from '../../utils/manila';
import { autoResolve, fixedKey, planCounts, slotKey, slotsToSave } from '../../utils/planReview';
import { predictOutcome } from '../../utils/publishReadiness';
import {
  DAY_CHOICES, defaultRoomId, defaultStartDay, defaultTimes, describeSetup, recallSetup, rememberSetup,
} from '../../utils/setupDefaults';
import { COMMON_TIMES, TIME_OPTIONS, clock12, endsText } from '../../utils/timeSlots';
import Drawer from './Drawer';
import { CreateSteps } from './MovieCreateParts';
import PlanReview from './PlanReview';
import './movieSetup.css';

const reasons = (err) => (err.errors ? Object.values(err.errors).join(' ') : describeError(err));
const plural = (n, word) => `${n} ${n === 1 ? word : word === 'clash' ? 'clashes' : `${word}s`}`;
const releaseDayOf = (value) => (validDay(value) ? value : manilaDay(value));

// Step 2 of adding a movie: showings and publishing, in the same panel as the details. It starts from
// sensible choices (the biggest room, the first week from opening day, the usual times, last
// time's price), says in one sentence what it will create, and only shows the controls when asked.
// A clash is explained and can be fixed in one click. The last button does everything: it saves
// the showings and, when chosen, publishes the movie in the same step.
export default function MovieSetup({ movie, rooms, gapMinutes = 15, roomError, onRetryRooms, onManageRooms, onBack, onFinished, onLater }) {
  const prefs = useMemo(() => recallSetup(), []);
  const active = rooms.filter((room) => room.isActive);
  const opensOn = releaseDayOf(movie.releaseDate);
  const comingSoon = opensOn > today();
  const isDraft = movie.status !== 'published';

  const [roomChoice, setRoomChoice] = useState('');
  const [days, setDays] = useState(prefs.days || 7);
  const [startDay, setStartDay] = useState(() => defaultStartDay(opensOn, today()));
  const [times, setTimes] = useState(() => (prefs.times?.length ? prefs.times : defaultTimes(movie.duration, gapMinutes)));
  const [price, setPrice] = useState(prefs.price || '400');
  const [publish, setPublish] = useState('now'); // 'now' | 'draft'
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [decisions, setDecisions] = useState({});
  const [collisions, setCollisions] = useState(() => new Map());
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ticket = useRef(0);
  const saving = useRef(false);

  const roomId = roomChoice && active.some((room) => room._id === roomChoice) ? roomChoice : defaultRoomId(rooms, prefs.room);
  const room = active.find((item) => item._id === roomId);
  const movies = useMemo(() => [{ _id: movie._id, title: movie.title, duration: Number(movie.duration) || 90 }], [movie._id, movie.title, movie.duration]);
  const publishWithShowings = isDraft && publish === 'now';

  // What would be sent, or why nothing can be sent yet.
  const request = useMemo(() => {
    if (!roomId) return { problem: '' };
    if (times.length === 0) return { problem: 'Pick at least one start time.' };
    const cents = Math.round(Number(price) * 100);
    if (price === '' || !Number.isFinite(cents) || cents < 0) return { problem: 'Enter the price per seat.' };
    const invalid = dateProblem(startDay, { min: today(), required: true });
    if (invalid) return { problem: invalid };
    return {
      path: '/showtimes/bulk',
      body: {
        movie: movie._id, auditorium: roomId, startDate: startDay, endDate: shiftDay(startDay, days - 1), times,
        ticketPrice: cents, published: true, publishMovie: publishWithShowings,
      },
    };
  }, [roomId, times, price, startDay, days, movie._id, publishWithShowings]);

  // Check the plan against the schedule a moment after the admin stops changing things.
  useEffect(() => {
    const mine = ++ticket.current;
    setPreview(null);
    if (request.problem !== undefined && !request.path) { setPreview({ problem: request.problem, request }); setChecking(false); return undefined; }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api(request.path, { method: 'POST', body: { ...request.body, skipConflicts: true, dryRun: true } });
        if (ticket.current === mine) {
          setPreview({ result, request });
          // Clashes are moved to the nearest free time or room straight away; each can still be undone.
          setDecisions(autoResolve(result, {}, { minutesOf: () => Number(movie.duration) || 90, gapMinutes }));
          setCollisions(new Map());
        }
      } catch (err) {
        if (ticket.current === mine) setPreview({ problem: reasons(err), request });
      } finally {
        if (ticket.current === mine) setChecking(false);
      }
    }, 350);
    return () => { clearTimeout(timer); ticket.current += 1; };
  }, [request, refresh]);

  const result = preview?.request === request ? preview.result : null;

  // Two fixes can land on the same time: check the plan as it now stands.
  useEffect(() => {
    if (!result) return undefined;
    const fixes = (result.skipped || []).filter((item) => item.kind === 'clash' && decisions[slotKey(item)] && decisions[slotKey(item)].type !== 'skip');
    if (fixes.length === 0) { setCollisions((current) => (current.size ? new Map() : current)); return undefined; }
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const check = await api('/showtimes/slots', { method: 'POST', body: { slots: slotsToSave(result, decisions), publishMovie: request.body.publishMovie, skipConflicts: true, dryRun: true } });
        if (!live) return;
        const byKey = new Map(check.skipped.map((item) => [slotKey(item), item.reason]));
        const next = new Map();
        for (const item of fixes) {
          const key = fixedKey(item, decisions[slotKey(item)]);
          if (byKey.has(key)) next.set(key, `This fix no longer fits: ${byKey.get(key)}. Choose another fix.`);
        }
        setCollisions(next);
      } catch { /* the final save checks again */ }
    }, 300);
    return () => { live = false; clearTimeout(timer); };
  }, [result, decisions]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = result ? planCounts(result, decisions, collisions) : { ready: 0, open: 0, fixed: 0, skipped: 0, total: 0 };
  const leftOut = result ? result.skipped.filter((item) => item.kind !== 'clash').length : 0;

  const save = async () => {
    if (saving.current || checking || !result || counts.open > 0 || counts.total === 0) return;
    saving.current = true;
    setError('');
    setBusy(true);
    try {
      const done = await api('/showtimes/slots', { method: 'POST', body: { slots: slotsToSave(result, decisions), publishMovie: request.body.publishMovie, skipConflicts: false, dryRun: false } });
      if (!done.created.length) { setError('No showings were saved. Review the schedule again.'); setRefresh((value) => value + 1); return; }
      rememberSetup({ room: roomId, times, price: String(price), days });
      onFinished({ showings: done.created, published: Boolean(done.moviePublished) || movie.status === 'published', announcement: false });
    } catch (err) {
      setError(`${reasons(err)} The schedule may have changed while you were deciding, so it is being checked again.`);
      setRefresh((value) => value + 1);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  // A movie that opens later can go live as an announcement now and get its showings later.
  const publishAnnouncement = async () => {
    if (saving.current) return;
    saving.current = true;
    setError('');
    setBusy(true);
    try {
      await api(`/admin/movies/${movie._id}`, { method: 'PATCH', body: { status: 'published' } });
      onFinished({ showings: [], published: true, announcement: true });
    } catch (err) {
      setError(reasons(err));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const toggleTime = (clock) => setTimes((current) => (current.includes(clock) ? current.filter((item) => item !== clock) : [...current, clock].sort()));
  const extraTimes = times.filter((clock) => !COMMON_TIMES.includes(clock));
  const sentence = describeSetup({ roomName: room?.name, days, startDay, times, price });
  const publishLine = comingSoon
    ? 'Customers see it as Coming soon and can book these showings as advance tickets.'
    : 'Customers can see the movie and book these showings as soon as you save.';

  const primaryLabel = busy ? 'Saving…'
    : checking ? 'Checking…'
      : counts.open > 0 ? `Fix ${plural(counts.open, 'clash')} first`
        : counts.total === 0 ? 'Nothing to save yet'
          : `${publishWithShowings ? 'Publish movie & save' : 'Save'} ${plural(counts.total, 'showing')}`;
  const blocked = busy || checking || !result || counts.open > 0 || counts.total === 0;
  const status = checking ? 'Checking the schedule…'
    : counts.open > 0 ? `${plural(counts.open, 'clash')} still ${counts.open === 1 ? 'needs' : 'need'} a decision.`
      : result && counts.total > 0 ? `${plural(counts.total, 'showing')} ready${counts.fixed ? `, ${counts.fixed} fixed` : ''}${leftOut ? `, ${leftOut} left out` : ''}.`
        : '';

  return (
    <>
      <div className="movie-editor-scroll setup-scroll">
        <div className="setup">
          <div className="setup-steps"><CreateSteps current={2} /></div>
          {error && <p className="movie-field-error" role="alert">{error}</p>}
          {roomError && <p className="movie-field-error" role="alert">{roomError} <button type="button" className="movie-schedule-link" onClick={onRetryRooms}>Try again</button></p>}

          {!roomError && active.length === 0 && (
            <div className="setup-norooms" role="status">
              <b>There is no room to schedule in yet.</b>
              <p>Your movie is saved as a draft. Add a room, then come back and press <b>Continue setup</b> on this movie.</p>
              {onManageRooms && <button type="button" className="movie-button movie-button-primary" onClick={onManageRooms}>Set up a room →</button>}
            </div>
          )}

          {active.length > 0 && (
            <>
              <section className="setup-plan-card" aria-labelledby="setup-plan-title">
                <div className="setup-plan-text">
                  <h3 id="setup-plan-title">Showings for {movie.title}</h3>
                  <p className="setup-sentence">{sentence}</p>
                  <p className="setup-hint">We picked the usual times for a {movie.duration}-minute movie{comingSoon ? ', starting on its opening day' : ''}. Change anything you like.</p>
                </div>
                <button type="button" className="movie-button movie-button-outline setup-change" aria-expanded={editing} aria-controls="setup-controls" onClick={() => setEditing((value) => !value)}>{editing ? 'Hide options' : 'Change'}</button>
              </section>

              {editing && (
                <section id="setup-controls" className="setup-controls" aria-label="Change the showings">
                  {active.length > 1 && (
                    <label>Room
                      <select value={roomId} onChange={(event) => setRoomChoice(event.target.value)}>
                        {active.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.rows * item.seatsPerRow} seats</option>)}
                      </select>
                    </label>
                  )}
                  <div className="setup-field">
                    <span className="movie-field-label">How many days</span>
                    <div className="when-chips" role="group" aria-label="How many days">
                      {DAY_CHOICES.map(([count, label]) => <button key={count} type="button" className={`when-chip${days === count ? ' active' : ''}`} aria-pressed={days === count} onClick={() => setDays(count)}>{label}</button>)}
                    </div>
                    <label className="when-other">Starting
                      <DatePicker label="First day of showings" required min={today()} value={startDay} onChange={setStartDay} />
                    </label>
                  </div>
                  <div className="setup-field">
                    <span className="movie-field-label">Start times <small>tap as many as you like</small></span>
                    <div className="when-chips" role="group" aria-label="Start times">
                      {[...COMMON_TIMES, ...extraTimes].map((clock) => <button key={clock} type="button" className={`when-chip${times.includes(clock) ? ' active' : ''}`} aria-pressed={times.includes(clock)} onClick={() => toggleTime(clock)}>{clock12(clock)}</button>)}
                    </div>
                    <label className="when-other">Add another time
                      <select value="" onChange={(event) => event.target.value && toggleTime(event.target.value)}>
                        <option value="">Choose…</option>
                        {TIME_OPTIONS.filter((option) => !times.includes(option.value)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    {times.length > 0 && <p className="setup-hint">{times.map((clock) => `${clock12(clock)} ${endsText(clock, movie.duration)}`).join(' · ')}</p>}
                  </div>
                  <label>Price per seat (₱)
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
                  </label>
                </section>
              )}

              <section className="setup-review" aria-live="polite">
                {preview?.problem
                  ? <p className="bulk-problem" role="alert">{preview.problem}</p>
                  : !result
                    ? <p className="setup-checking">{checking ? 'Checking the schedule…' : ''}</p>
                    : <PlanReview compact result={result} decisions={decisions} setDecisions={setDecisions} collisions={collisions} gapMinutes={gapMinutes} rooms={rooms} movies={movies} />}
              </section>

              {isDraft && (
                <fieldset className="setup-choice">
                  <legend>When these are saved</legend>
                  <label className={`setup-option${publish === 'now' ? ' on' : ''}`}>
                    <input type="radio" name="setup-publish" checked={publish === 'now'} onChange={() => setPublish('now')} />
                    <span><b>Publish the movie now</b><small>{publishLine}</small></span>
                  </label>
                  <label className={`setup-option${publish === 'draft' ? ' on' : ''}`}>
                    <input type="radio" name="setup-publish" checked={publish === 'draft'} onChange={() => setPublish('draft')} />
                    <span><b>Keep it as a draft</b><small>Nothing is visible to customers. Publish later from the movie&apos;s page.</small></span>
                  </label>
                </fieldset>
              )}
            </>
          )}
        </div>
      </div>

      <div className="movie-editor-actions setup-actions">
        <button type="button" className="movie-button movie-button-outline" disabled={busy} onClick={onBack}>← Details</button>
        {active.length > 0 && <span className="setup-status" role="status">{status}</span>}
        {active.length > 0 && (
          <button type="button" className="movie-button movie-button-primary" disabled={blocked} aria-busy={busy} onClick={save}>
            <ActionPending pending={busy}>{primaryLabel}</ActionPending>
          </button>
        )}
      </div>
      <div className="setup-later">
        {comingSoon && isDraft && <button type="button" className="movie-schedule-link" disabled={busy} onClick={publishAnnouncement}>Skip showings and publish as Coming soon</button>}
        <button type="button" className="movie-schedule-link" disabled={busy} onClick={onLater}>I&apos;ll do this later</button>
      </div>
    </>
  );
}

// What happened, and what to do next. Shown in the same panel, instead of a pop-up.
export function SetupDone({ movie, rooms, outcome, onAddMore, onClose }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const count = outcome.showings.length;
  const customers = predictOutcome({ releaseDate: movie.releaseDate, bookable: outcome.published ? count : 0 });
  const roomName = (id) => rooms.find((room) => room._id === String(id))?.name || 'Cinema';
  const shown = [...outcome.showings].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).slice(0, 4);
  return (
    <div className="movie-editor-scroll setup-scroll">
      <div className="setup-done">
        <div className="setup-steps"><CreateSteps current={3} /></div>
        <span className="setup-done-mark" aria-hidden="true">✓</span>
        <h3 id="setup-done-title" ref={heading} tabIndex={-1}>{outcome.published ? `${movie.title} is live` : `${movie.title} is saved as a draft`}</h3>
        <p>
          {outcome.announcement
            ? 'Customers can see the movie and its release date. Add showings when you are ready to sell tickets.'
            : outcome.published
              ? `${plural(count, 'showing')} ${count === 1 ? 'is' : 'are'} on sale.`
              : `${plural(count, 'showing')} saved and hidden. Nothing is visible to customers until you publish the movie.`}
        </p>
        {outcome.published && (
          <div className="setup-done-where">
            <span className={`publish-outcome-tag ${customers.tone}`}>{customers.label}</span>
            <ul>{customers.where.map(([name, yes, note]) => <li key={name}><span>{name}</span><span className={yes ? 'yes' : 'no'}>{yes ? 'Yes' : 'No'}{note ? ` · ${note}` : ''}</span></li>)}</ul>
          </div>
        )}
        {shown.length > 0 && (
          <ul className="setup-done-list" aria-label="Saved showings">
            {shown.map((item) => <li key={item._id || item.startTime}><b>{shortDate(item.startTime)}</b><span>{displayTime(item.startTime)}</span><span>{roomName(item.auditorium)}</span></li>)}
            {count > shown.length && <li className="more">and {count - shown.length} more</li>}
          </ul>
        )}
        <div className="movie-saved-actions">
          {outcome.published && <a className="movie-button movie-button-primary" href={`/movie/${movie._id}`} target="_blank" rel="noreferrer">View on the site ↗</a>}
          <button type="button" className="movie-button movie-button-outline" onClick={onAddMore}>{count ? 'Add more showings' : 'Add showings'}</button>
          <button type="button" className={`movie-button ${outcome.published ? 'movie-button-outline' : 'movie-button-primary'}`} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// The whole second step in its own panel: set up, then the result. Pressing "Add more" starts again
// from the choices that were just remembered.
export function SetupDrawer({ movie, initialOutcome = null, rooms, gapMinutes, roomError, onRetryRooms, onManageRooms, onBack, onClose, onFinished }) {
  const [outcome, setOutcome] = useState(initialOutcome);
  const [round, setRound] = useState(0);
  const finish = (result) => { setOutcome(result); onFinished?.(result); };
  const close = () => onClose(outcome !== null);
  return (
    <Drawer bare wide title={outcome ? movie.title : `Showings · ${movie.title}`} onClose={close}>
      {outcome
        ? <SetupDone movie={movie} rooms={rooms} outcome={outcome} onAddMore={() => { setOutcome(null); setRound((value) => value + 1); }} onClose={close} />
        : <MovieSetup key={round} movie={movie} rooms={rooms} gapMinutes={gapMinutes} roomError={roomError} onRetryRooms={onRetryRooms} onManageRooms={onManageRooms} onBack={onBack} onFinished={finish} onLater={close} />}
    </Drawer>
  );
}
