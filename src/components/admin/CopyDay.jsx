import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { dateProblem } from '../../utils/calendar';
import { describeError } from '../../utils/adminTools';
import { daysBetween, displayTime, manilaDay, shiftDay, shortDate, today } from '../../utils/manila';
import { RANGES, rangeFor } from '../../utils/schedule';
import { describeClash, fixedSlot, pickRooms, pickTime, planCounts, skipAllClashes, slotKey, slotsToSave } from '../../utils/planReview';
import { copyOccupied, copyOutcome, refreshCopyPlan, suggestCopyFixes } from '../../utils/copyDay';
import DatePicker from '../DatePicker';
import Drawer from './Drawer';
import Feedback from './Feedback';
import { PlanDay } from './PlanReview';
import './copyDay.css';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const dayLabel = day => shortDate(`${day}T12:00:00+08:00`);
const message = err => (err.errors ? Object.values(err.errors).join(' ') : describeError(err)).replace(/clashes/gi, 'conflicts').replace(/clash/gi, 'conflict');
const emptyCollisions = new Map();

export default function CopyDay({ open, movies, rooms, defaultDay, gapMinutes = 15, onClose, onModeChange, onDone, roomError, onRetryRooms }) {
  const [from, setFrom] = useState(defaultDay || today());
  const [range, setRange] = useState('next7');
  const [custom, setCustom] = useState({ startDate: shiftDay(today(), 1), endDate: shiftDay(today(), 7) });
  const [hidden, setHidden] = useState(false);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [decisions, setDecisions] = useState({});
  const [suggestions, setSuggestions] = useState(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [skipUnavailable, setSkipUnavailable] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const committed = useRef(false);
  const generation = useRef(0);
  const heading = useRef(null);
  const leaveFocus = useRef(null);
  const suggestionPreview = useRef(null);
  const dates = range === 'custom' ? custom : rangeFor(range, today());
  const toDates = dates.startDate && dates.endDate && dates.endDate >= dates.startDate
    ? daysBetween(dates.startDate, dates.endDate).filter(day => day !== from) : [];
  const problem = dateProblem(from, { required: true })
    || dateProblem(dates.startDate, { min: today(), required: true })
    || dateProblem(dates.endDate, { min: dates.startDate, required: true })
    || (!toDates.length ? 'Choose at least one destination day other than the source day.' : '')
    || (toDates.length > 31 ? 'Choose at most 31 destination days.' : '');
  const counts = result ? planCounts(result, decisions) : { total: 0, open: 0, skipped: 0, fixed: 0 };
  const conflicts = result?.skipped.filter(item => item.kind === 'clash') || [];
  const unavailable = result?.skipped.filter(item => item.kind !== 'clash') || [];
  const movieOf = id => movies.find(movie => movie._id === String(id));
  const minutesOf = id => movieOf(id)?.duration || 90;
  const roomName = id => rooms.find(room => room._id === String(id))?.name || 'Auditorium unavailable';

  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => { if (suggestions) suggestionPreview.current?.focus(); }, [suggestions]);
  useEffect(() => {
    if (!dirty) return undefined;
    const protect = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);
  useEffect(() => () => { generation.current += 1; }, []);

  const leave = action => {
    if (lock.current) return;
    if (leaving) { cancelLeave(); return; }
    if (dirty) { leaveFocus.current = document.activeElement; setLeaving(() => action); } else action();
  };
  const cancelLeave = () => {
    setLeaving(null);
    requestAnimationFrame(() => (leaveFocus.current?.isConnected ? leaveFocus.current : heading.current)?.focus());
  };
  const changeDates = action => {
    generation.current += 1;
    action(); setDirty(true); setResult(null); setDecisions({}); setSuggestions(null);
    setError(''); setNotice(''); setSelected(''); setSkipUnavailable(false); setStep(1);
  };
  const decide = (item, decision) => {
    setDecisions(current => {
      const next = { ...current };
      if (decision) next[slotKey(item)] = decision; else delete next[slotKey(item)];
      return next;
    });
    setSuggestions(null); setDirty(true); setNotice('');
  };
  const run = async (label, work) => {
    if (lock.current) return;
    lock.current = true; setBusy(label); setError('');
    const version = generation.current;
    try { await work(() => version === generation.current); }
    catch (err) { if (version === generation.current) setError(message(err)); }
    finally { lock.current = false; setBusy(''); }
  };
  const checkAvailability = () => run('Checking availability…', async current => {
    if (problem) { setError(problem); return; }
    if (result) { setStep(2); return; }
    const checked = await api('/showtimes/copy', { method: 'POST', body: { fromDate: from, toDates, ...(hidden ? { published: false } : {}), dryRun: true, skipConflicts: true } });
    if (!current()) return;
    setResult(checked); setSourceCount(checked.requested / toDates.length);
    setDecisions({}); setSuggestions(null); setSelected(''); setSkipUnavailable(false);
    setDirty(true); setStep(2);
  });
  const validate = choices => api('/showtimes/slots', { method: 'POST', body: { slots: slotsToSave(result, choices), dryRun: true, skipConflicts: true } });
  const suggest = () => run('Checking suggestions…', async current => {
    const base = { ...decisions };
    const proposed = suggestCopyFixes(result, base, { minutesOf, gapMinutes });
    // Validate the whole proposed plan, including ready copies, against the current server rules.
    if (slotsToSave(result, proposed).length) {
      const checked = await validate(proposed);
      if (!current()) return;
      const failures = new Set(checked.skipped.map(slotKey));
      for (const item of conflicts) {
        const key = slotKey(item);
        if (!base[key] && proposed[key] && failures.has(slotKey(fixedSlot(item, proposed[key])))) delete proposed[key];
      }
    }
    if (current()) setSuggestions(proposed);
  });
  const applySuggestions = () => run('Checking suggestions…', async current => {
    const checked = await validate(suggestions);
    if (!current()) return;
    if (checked.skipped.length) {
      setSuggestions(null); setError('The schedule changed. Request new suggestions or resolve each conflict. No showings were saved.'); return;
    }
    setDecisions(suggestions); setSuggestions(null); setDirty(true);
    setNotice('Suggestions applied to this preview. No showings have been saved.');
    requestAnimationFrame(() => heading.current?.focus());
  });
  const copy = () => run('Copying showings…', async current => {
    if (committed.current || !result || problem || counts.open || !counts.total || (unavailable.length && !skipUnavailable) || uncertain) return;
    const checked = await validate(decisions);
    if (!current()) return;
    if (checked.skipped.length) {
      const fresh = refreshCopyPlan(result, decisions, checked);
      setResult(fresh.result); setDecisions(fresh.decisions); setSuggestions(null); setSkipUnavailable(false); setStep(3);
      setError('Availability changed. Review the new conflicts and unavailable showings below. No showings were saved.'); return;
    }
    let done;
    try {
      done = await api('/showtimes/slots', { method: 'POST', body: { slots: slotsToSave(result, decisions), dryRun: false, skipConflicts: false } });
    } catch (err) {
      if (err.status === 409) {
        const latest = await validate(decisions);
        const fresh = refreshCopyPlan(result, decisions, latest);
        setResult(fresh.result); setDecisions(fresh.decisions); setSuggestions(null); setStep(3); setSkipUnavailable(false);
        setError(`${message(err)} Review availability before copying again. No showings were saved.`);
      } else if (!err.status || err.status >= 500) {
        setUncertain(true);
        setError('The save could not be confirmed. The created and failed counts are unknown. Check the schedule before starting another copy to avoid duplicates.');
      } else setError(`${message(err)} No showings were saved.`);
      return;
    }
    const outcome = copyOutcome(done, counts.total, counts.skipped);
    const summary = `${outcome.created} created, ${outcome.skipped} skipped, ${outcome.failed} failed.`;
    if (!outcome.complete) {
      setUncertain(true); setNotice(''); setError(`${summary} Review the schedule before retrying the failed copies.`); return;
    }
    if (!outcome.created) { setError('No showings were copied. Choose other dates or resolve conflicts.'); return; }
    setDirty(false);
    committed.current = true;
    const skipped = result.skipped.filter(item => item.kind !== 'clash' || decisions[slotKey(item)]?.type === 'skip');
    onDone(summary, null, null, { ...done, skipped, skippedCount: skipped.length, failedCount: 0, requested: result.requested, visibilityMessage: hidden ? 'These copies are hidden from customers.' : 'Copied showings keep their original visibility.' });
  });

  if (!open) return null;
  const readyToCopy = result && counts.open === 0 && counts.total > 0 && (!unavailable.length || skipUnavailable) && !uncertain;
  const final = step === 3 || (step === 2 && counts.open === 0);
  const taken = result ? copyOccupied(result, decisions, minutesOf) : [];
  const suggestedChanges = suggestions ? conflicts.filter(item => suggestions[slotKey(item)] && !decisions[slotKey(item)]) : [];
  const decisionText = decision => decision?.type === 'skip' ? 'Skipped' : decision?.type === 'time' ? `Resolved: ${displayTime(decision.start)}` : decision?.type === 'room' ? `Resolved: ${roomName(decision.room)}` : 'Needs attention';
  const groups = [...new Set(conflicts.map(item => manilaDay(item.startTime)))].sort();

  return <Drawer title="Copy a day" onClose={() => leave(onClose)} className="admin-drawer-copy">
    <fieldset className="bulk-save-fields copy-flow" disabled={Boolean(busy) || Boolean(leaving)} aria-busy={Boolean(busy)}>
      <div className="when-chips bulk-mode" role="group" aria-label="What to do">
        <button type="button" className="when-chip" onClick={() => leave(() => onModeChange('many'))}>New showings</button>
        <button type="button" className="when-chip active" aria-pressed="true">Copy a day</button>
      </div>
      <ol className="copy-progress" aria-label="Copy progress">{['Choose dates', 'Review', 'Resolve and copy'].map((label, i) => <li key={label} aria-current={step === i + 1 ? 'step' : undefined}>{i + 1}. {label}</li>)}</ol>
      <h3 ref={heading} tabIndex={-1}>{step === 1 ? 'Choose dates' : step === 2 ? 'Review copies' : 'Resolve conflicts and copy'}</h3>
      <Feedback error={error || roomError} notice={notice} />
      {roomError && <button type="button" className="btn btn-secondary" onClick={onRetryRooms}>Retry loading rooms</button>}
      {step === 1 ? <>
        <p className="bulk-hint">Copies retain their movie, auditorium and time unless you change them while resolving conflicts. All times are in Manila.</p>
        <label>Copy from<DatePicker label="Copy from" required value={from} onChange={value => changeDates(() => setFrom(value))} /></label>
        <section aria-label="Copy to" className="copy-destinations"><h4>Copy to</h4>
          <div className="when-chips" role="group" aria-label="Destination dates">
            {RANGES.map(([key, label]) => <button key={key} type="button" className={`when-chip${range === key ? ' active' : ''}`} aria-pressed={range === key} onClick={() => changeDates(() => setRange(key))}>{label}</button>)}
            <button type="button" className={`when-chip${range === 'custom' ? ' active' : ''}`} aria-pressed={range === 'custom'} onClick={() => changeDates(() => { setCustom(dates); setRange('custom'); })}>Pick dates…</button>
          </div>
          {range === 'custom' && <div className="copy-date-range"><label>First destination<DatePicker label="First destination" required min={today()} value={custom.startDate} onChange={value => changeDates(() => setCustom({ ...custom, startDate: value }))} /></label><label>Last destination<DatePicker label="Last destination" required min={custom.startDate > today() ? custom.startDate : today()} value={custom.endDate} onChange={value => changeDates(() => setCustom({ ...custom, endDate: value }))} /></label></div>}
          <p className="bulk-hint">{dayLabel(dates.startDate)} to {dayLabel(dates.endDate)} · {plural(toDates.length, 'destination day')}. The source day is excluded.</p>
        </section>
        <label className="admin-check"><input type="checkbox" checked={hidden} onChange={event => changeDates(() => setHidden(event.target.checked))} /> Keep copies hidden until I publish them</label>
        {problem && <p className="bulk-problem">{problem}</p>}
      </> : result && <>
        <p className="copy-summary" role="status"><b>{plural(result.requested, 'proposed showing')}</b> across {plural(toDates.length, 'destination day')} · {plural(conflicts.length, 'conflict')}.<br /><span>{plural(sourceCount, 'source showing')} from {dayLabel(from)}. {plural(counts.fixed, 'conflict')} resolved; {counts.open} need attention.</span></p>
        <details className="copy-timeline"><summary>View timeline</summary><PlanDay copy result={result} decisions={decisions} collisions={emptyCollisions} rooms={rooms} movies={movies} /></details>
        {step === 2 && <p className="bulk-hint">{counts.open ? 'Review the summary, then resolve conflicts before copying.' : 'No unresolved conflicts. You can copy these showings now.'}</p>}
        {step === 2 && counts.open === 0 && conflicts.length > 0 && <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>Review resolution choices</button>}
        {step === 3 && conflicts.length > 0 && <>
          <div className="copy-tools"><button type="button" className="btn btn-secondary" disabled={!counts.open} onClick={suggest}>Suggest fixes</button><button type="button" className="btn btn-secondary" disabled={!counts.open} onClick={() => { setDecisions(skipAllClashes(result, decisions)); setSuggestions(null); setDirty(true); }}>Skip conflicting showings ({counts.open})</button></div>
          <p className="bulk-hint">Skipping will skip {plural(counts.open, 'unresolved showing')}. Use Resolve to change any decision before copying.</p>
          {suggestions && <section ref={suggestionPreview} tabIndex={-1} className="copy-suggestions" aria-label="Suggested changes"><h4>Preview suggested changes</h4>
            {suggestedChanges.length ? <ul>{suggestedChanges.map(item => <li key={slotKey(item)}>{dayLabel(manilaDay(item.startTime))} · {movieOf(item.movie)?.title} · {displayTime(item.startTime)} in {roomName(item.auditorium)} → {suggestions[slotKey(item)].type === 'time' ? `${displayTime(suggestions[slotKey(item)].start)} in ${roomName(item.auditorium)}` : `${displayTime(item.startTime)} in ${roomName(suggestions[slotKey(item)].room)}`}</li>)}</ul> : <p>No available alternatives were found. Resolve individually or skip conflicting showings.</p>}
            <p className="bulk-hint">{plural(counts.open - suggestedChanges.length, 'conflict')} will still need attention. Nothing is saved when you apply suggestions.</p>
            <div className="copy-tools"><button type="button" className="btn btn-secondary" disabled={!suggestedChanges.length} onClick={applySuggestions}>Apply suggestions</button><button type="button" className="btn btn-secondary" onClick={() => setSuggestions(null)}>Dismiss</button></div>
          </section>}
          {groups.map(day => <section key={day} className="copy-conflict-group"><h4>{dayLabel(day)}</h4>{conflicts.filter(item => manilaDay(item.startTime) === day).map(item => {
            const key = slotKey(item); const decision = decisions[key]; const expanded = selected === key;
            const time = pickTime(item, taken, { minutes: minutesOf(item.movie), gapMinutes });
            const alternatives = pickRooms(item, taken, { minutes: minutesOf(item.movie), gapMinutes });
            return <article key={key} className="copy-conflict"><div className="copy-conflict-row"><b>{movieOf(item.movie)?.title || 'Unavailable movie'}</b><span>{displayTime(item.startTime)} · {roomName(item.auditorium)}</span><span className={decision ? '' : 'copy-needs-attention'}>{decisionText(decision)}</span><button type="button" className="btn btn-secondary" aria-expanded={expanded} aria-controls={`resolve-${key}`} onClick={() => setSelected(expanded ? '' : key)}>Resolve</button></div>
              {expanded && <div id={`resolve-${key}`} className="copy-alternatives"><p>{describeClash(item, { roomName: roomName(item.auditorium), movieTitle: movieOf(item.movie)?.title || 'This movie', movieMinutes: minutesOf(item.movie), gapMinutes })}</p>
                <div className="copy-tools">{time && <button type="button" className="btn btn-secondary" onClick={() => decide(item, { type: 'time', start: time })}>Start at {displayTime(time)}, same auditorium</button>}{alternatives.map(room => <button key={room._id} type="button" className="btn btn-secondary" onClick={() => decide(item, { type: 'room', room: String(room._id) })}>Keep {displayTime(item.startTime)}, use {room.name}</button>)}<button type="button" className="btn btn-secondary" onClick={() => decide(item, { type: 'skip' })}>Skip this showing</button>{decision && <button type="button" className="btn btn-secondary" onClick={() => decide(item, null)}>Undo decision</button>}</div>
                {!time && !alternatives.length && <p className="bulk-hint">No free alternative is available. Skip this showing or choose different dates.</p>}
              </div>}
            </article>;
          })}</section>)}
        </>}
        {unavailable.length > 0 && <section className="copy-unavailable"><h4>{plural(unavailable.length, 'unavailable showing')}</h4><ul>{unavailable.map(item => <li key={slotKey(item)}>{dayLabel(manilaDay(item.startTime))} · {movieOf(item.movie)?.title || 'Showing'} · {displayTime(item.startTime)}: {item.reason.replace(/Clashes/g, 'Conflicts').replace(/clashes/g, 'conflicts')}</li>)}</ul><label className="admin-check"><input type="checkbox" checked={skipUnavailable} onChange={event => setSkipUnavailable(event.target.checked)} /> Skip these {plural(unavailable.length, 'unavailable showing')}</label></section>}
      </>}
      <footer className="copy-footer">
        <p id="copy-action-hint" role="status">{busy || (step === 1 ? 'Check availability to preview copies. Nothing will be saved.' : uncertain ? 'Check the schedule before another copy attempt.' : counts.open ? `${plural(counts.open, 'conflict')} must be resolved or skipped before copying. ${counts.skipped} skipped.` : !counts.total ? `Nothing can be copied: all ${result?.requested || 0} proposed showings are unavailable or skipped. Change dates or undo a skip.` : `${plural(counts.total, 'showing')} will be copied; ${counts.skipped} skipped.${unavailable.length && !skipUnavailable ? ' Confirm skipping unavailable showings to continue.' : ''}`)}</p>
        <div className="copy-footer-actions"><button type="button" className="btn btn-secondary" onClick={() => { setSuggestions(null); if (step === 1) leave(onClose); else setStep(step - 1); }}>Back</button>
          {step === 1 ? <button type="button" className="btn btn-primary" disabled={Boolean(problem) || uncertain} onClick={checkAvailability}>Check availability</button> : !final ? <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>Resolve conflicts</button> : counts.total > 0 && <button type="button" className="btn btn-primary" aria-describedby="copy-action-hint" disabled={!readyToCopy} onClick={copy}>Copy {plural(counts.total, 'showing')}</button>}
        </div>
      </footer>
    </fieldset>
    {leaving && <div className="copy-discard" role="alertdialog" aria-modal="true" aria-label="Discard copy changes?"><p>Discard this unsaved copy plan?</p><button type="button" className="btn btn-secondary" autoFocus onClick={cancelLeave}>Keep editing</button><button type="button" className="btn btn-secondary" onClick={() => { setDirty(false); leaving(); }}>Discard changes</button></div>}
  </Drawer>;
}
