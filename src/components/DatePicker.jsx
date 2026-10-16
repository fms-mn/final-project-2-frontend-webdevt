import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { today, shiftDay } from '../utils/manila';
import { dateProblem, enabledDay, monthDays, monthOffset, selectionLimits, validDay } from '../utils/calendar';
import './datePicker.css';

const format = (day, options) => validDay(day) ? new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', ...options }) : day;
const months = Array.from({ length: 12 }, (_, month) => new Date(2024, month, 1).toLocaleDateString('en-PH', { month: 'long' }));

export default function DatePicker({ value = '', onChange, label = 'Date', min, max, allowedDates, disabled = false, required = false, name, error, ...accessibility }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const id = useId();
  const problem = error || (!disabled && dateProblem(value, { min, max, allowedDates, required }));
  return <span className="filme-date-field">
    <button {...accessibility} ref={trigger} type="button" name={name} className="filme-date-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={open}
      aria-label={`${label}: ${value || 'Choose date'}`} aria-invalid={Boolean(problem)} aria-describedby={problem ? `${id}-error` : accessibility['aria-describedby']} onClick={() => setOpen(true)}>
      <span>{validDay(value) ? format(value, { month: 'short', day: 'numeric', year: 'numeric' }) : value || 'Choose date'}</span><FiCalendar aria-hidden="true" />
    </button>
    {problem && <span className="filme-date-error" id={`${id}-error`} role="alert">{problem}</span>}
    {open && <Calendar value={value} label={label} limits={{ min, max, allowedDates, required }} onSelect={onChange} onClose={() => setOpen(false)} returnFocus={trigger} />}
  </span>;
}

function Calendar({ value, label, limits: fieldLimits, onSelect, onClose, returnFocus }) {
  const limits = selectionLimits(fieldLimits, today());
  const initial = enabledDay(validDay(value) ? value : today(), 1, limits) || enabledDay(today(), -1, limits) || today();
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [focused, setFocused] = useState(initial);
  const [typed, setTyped] = useState(value);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const titleId = useId();
  const monthId = useId();
  const manualId = useId();
  const currentDay = today();
  const days = monthDays(month);
  const rovingDay = days.includes(focused) && !dateProblem(focused, limits) ? focused : days.find(day => day.slice(0, 7) === month && !dateProblem(day, limits));

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    (element.querySelector(`[data-day="${initial}"]`) || element.querySelector('input'))?.focus();
    return () => { element.close(); returnFocus.current?.focus({ preventScroll: true }); };
  }, []);

  const select = day => {
    const problem = dateProblem(day, limits);
    if (problem) { setError(problem); return; }
    onSelect(day);
    onClose();
  };
  const move = (candidate, direction) => {
    const next = enabledDay(candidate, direction, limits);
    if (!next) return;
    setMonth(next.slice(0, 7)); setFocused(next);
    requestAnimationFrame(() => dialog.current?.querySelector(`[data-day="${next}"]`)?.focus());
  };
  const gridKeys = event => {
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next;
    let direction = 1;
    if (event.key in deltas) { direction = Math.sign(deltas[event.key]); next = shiftDay(focused, deltas[event.key]); }
    if (event.key === 'Home' || event.key === 'End') { const weekday = new Date(`${focused}T12:00:00+08:00`).getUTCDay(); direction = event.key === 'Home' ? -1 : 1; next = shiftDay(focused, event.key === 'Home' ? -weekday : 6 - weekday); }
    if (event.key === 'PageUp' || event.key === 'PageDown') { direction = event.key === 'PageUp' ? -1 : 1; next = monthOffset(focused, direction * (event.shiftKey ? 12 : 1)); }
    if (next) { event.preventDefault(); event.stopPropagation(); move(next, direction); }
  };
  const navigate = offset => {
    const next = monthOffset(`${month}-01`, offset);
    if (validDay(next)) { setMonth(next.slice(0, 7)); setFocused(enabledDay(next, 1, limits) || next); }
  };

  return createPortal(<dialog className="filme-calendar" ref={dialog} aria-modal="true" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <div className="filme-calendar-title"><h2 id={titleId}>Choose {label.toLowerCase()}</h2><button type="button" aria-label="Close calendar" onClick={onClose}><FiX /></button></div>
    <div className="filme-calendar-heading">
      <button type="button" aria-label="Previous month" onClick={() => navigate(-1)} disabled={month <= '0001-01'}><FiChevronLeft /></button>
      <div><select aria-label="Calendar month" value={month.slice(5)} onChange={event => { setMonth(`${month.slice(0, 4)}-${event.target.value}`); setFocused(`${month.slice(0, 4)}-${event.target.value}-01`); }}>{months.map((name, index) => <option key={name} value={String(index + 1).padStart(2, '0')}>{name}</option>)}</select>
        <input aria-label="Calendar year" type="number" min="1" max="9999" value={Number(month.slice(0, 4))} onChange={event => { const year = Number(event.target.value); if (Number.isInteger(year) && year >= 1 && year <= 9999) { const next = `${String(year).padStart(4, '0')}-${month.slice(5)}`; setMonth(next); setFocused(`${next}-01`); } }} /></div>
      <button type="button" aria-label="Next month" onClick={() => navigate(1)} disabled={month >= '9999-12'}><FiChevronRight /></button>
    </div>
    <p className="filme-calendar-sr" id={monthId} aria-live="polite">{format(`${month}-01`, { month: 'long', year: 'numeric' })}</p>
    <div className="filme-calendar-grid" role="grid" aria-labelledby={monthId} onKeyDown={gridKeys}>
      <div className="filme-calendar-week" role="row">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span role="columnheader" key={day}>{day}</span>)}</div>
      {Array.from({ length: 6 }, (_, row) => <div className="filme-calendar-week" role="row" key={row}>{days.slice(row * 7, row * 7 + 7).map(day => <span role="gridcell" aria-selected={day === value} key={day}>
        <button type="button" data-day={day} className={`${day === value ? 'is-selected ' : ''}${day === currentDay ? 'is-today ' : ''}${day.slice(0, 7) !== month ? 'is-other-month' : ''}`}
          disabled={Boolean(dateProblem(day, limits))} tabIndex={day === rovingDay ? 0 : -1} aria-current={day === currentDay ? 'date' : undefined} aria-label={format(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          onFocus={() => setFocused(day)} onClick={() => select(day)}>{Number(day.split('-').at(-1))}</button>
      </span>)}</div>)}
    </div>
    <div className="filme-calendar-shortcuts"><button type="button" disabled={Boolean(dateProblem(currentDay, limits))} onClick={() => select(currentDay)}>Today</button>{!limits.required && <button type="button" onClick={() => select('')}>Clear date</button>}</div>
    <label className="filme-calendar-manual">Enter date<span className="filme-calendar-entry"><input type="text" autoComplete="off" spellCheck={false} aria-label={`${label} as YYYY-MM-DD`} placeholder="YYYY-MM-DD" value={typed} aria-describedby={`${manualId}-hint${error ? ` ${manualId}-error` : ''}`} aria-invalid={Boolean(error)} onChange={event => { setTyped(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); select(typed); } }} /><button type="button" onClick={() => select(typed)}>Apply</button></span><span id={`${manualId}-hint`}>YYYY-MM-DD · Manila time</span></label>
    {error && <p className="filme-date-error" role="alert" id={`${manualId}-error`}>{error}</p>}
  </dialog>, document.body);
}
