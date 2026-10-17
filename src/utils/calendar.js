export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(`${value}T12:00:00Z`);
  return year >= 1 && Number.isFinite(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

export function dateProblem(value, { min, max, allowedDates, required = false } = {}) {
  if (!value) return required ? 'Choose a date.' : '';
  if (!validDay(value)) return 'Enter a valid date as YYYY-MM-DD.';
  if (min && value < min) return `Choose ${min} or a later date.`;
  if (max && value > max) return `Choose ${max} or an earlier date.`;
  if (allowedDates && !allowedDates.includes(value)) return 'No showing is available on this date. Choose an enabled date.';
  return '';
}

export function selectionLimits(limits, currentDay) {
  return { ...limits, min: limits.min && limits.min > currentDay ? limits.min : currentDay };
}

export function monthOffset(day, offset) {
  const date = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const last = new Date(`${year}-${month}-01T12:00:00Z`);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  return `${year}-${month}-${String(Math.min(Number(day.slice(8)), last.getUTCDate())).padStart(2, '0')}`;
}

export function monthDays(month) {
  // UTC is only used for civil-day arithmetic; stored YYYY-MM-DD values are never timezone-converted.
  const first = new Date(`${month}-01T12:00:00Z`);
  const weekday = first.getUTCDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(1 - weekday + index);
    return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  });
}

export function enabledDay(candidate, direction, limits) {
  if (limits.allowedDates) {
    const dates = [...limits.allowedDates].filter(day => !dateProblem(day, limits)).sort();
    return direction > 0 ? dates.find(day => day >= candidate) : dates.reverse().find(day => day <= candidate);
  }
  const day = limits.min && candidate < limits.min ? limits.min : limits.max && candidate > limits.max ? limits.max : candidate;
  return dateProblem(day, limits) ? undefined : day;
}
