import { useMemo } from 'react';
import { dayHeading, today } from '../../utils/manila';
import { COMMON_TIMES, TIME_OPTIONS, clock12, endsText, quickDays } from '../../utils/timeSlots';

// Pick the day and the start time of a showing without typing a date and a time into one box:
// tap Today / Tomorrow / a day, tap a common start time (or choose any 15-minute time), and the
// screen says when the show ends. `value` is "YYYY-MM-DDTHH:MM" in cinema time, like the old box.
// `problem` is a warning to show under the picker (for example a clash with another showing).
export default function WhenPicker({ value, onChange, disabled = false, minutes, problem = '' }) {
  const [day, time] = String(value || '').split('T');
  const days = useMemo(() => quickDays(today()), []);
  const options = useMemo(() => (
    time && !TIME_OPTIONS.some((option) => option.value === time) ? [{ value: time, label: clock12(time) }, ...TIME_OPTIONS] : TIME_OPTIONS
  ), [time]);
  const set = (nextDay, nextTime) => onChange(`${nextDay || today()}T${nextTime || '16:00'}`);

  return (
    <div className="when-picker">
      <div className="when-field">
        <span className="when-label" id="when-day-label">Day</span>
        <div className="when-chips" role="group" aria-labelledby="when-day-label">
          {days.map((item) => (
            <button key={item.day} type="button" className={`when-chip${day === item.day ? ' active' : ''}`} aria-pressed={day === item.day} disabled={disabled} onClick={() => set(item.day, time)}>{item.label}</button>
          ))}
        </div>
        <label className="when-other">Another day
          <input type="date" value={day || ''} min={today()} disabled={disabled} onChange={(event) => event.target.value && set(event.target.value, time)} />
        </label>
      </div>

      <div className="when-field">
        <span className="when-label" id="when-time-label">Start time</span>
        <div className="when-chips" role="group" aria-labelledby="when-time-label">
          {COMMON_TIMES.map((clock) => (
            <button key={clock} type="button" className={`when-chip${time === clock ? ' active' : ''}`} aria-pressed={time === clock} disabled={disabled} onClick={() => set(day, clock)}>{clock12(clock)}</button>
          ))}
        </div>
        <label className="when-other">Or any time
          <select value={time || ''} disabled={disabled} onChange={(event) => set(day, event.target.value)}>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {day && time && (
        <p className="when-summary" role="status">
          <b>{dayHeading(day)}</b> at <b>{clock12(time)}</b>{minutes ? <> · {endsText(time, minutes)}</> : null}
        </p>
      )}
      {problem && <p className="when-problem" role="alert">{problem}</p>}
    </div>
  );
}
