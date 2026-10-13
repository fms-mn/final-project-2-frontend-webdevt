// A small seat chart for choosing seats to block. Seat labels are A1, A2, ... row by row.
// `locked` seats are blocked somewhere else (for example by the room) and cannot be toggled here.
export default function SeatGrid({ rows, seatsPerRow, selected, onChange, locked = [], disabled = false }) {
  const toggle = (label) => onChange(selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label].sort());
  return (
    <div className="seat-grid" role="group" aria-label="Seats" style={{ '--seats': seatsPerRow }}>
      {Array.from({ length: rows }, (_, row) => Array.from({ length: seatsPerRow }, (__, seat) => {
        const label = `${String.fromCharCode(65 + row)}${seat + 1}`;
        const fixed = locked.includes(label);
        const on = selected.includes(label);
        return (
          <button
            key={label}
            type="button"
            className={`seat-cell ${on || fixed ? 'blocked' : ''}`}
            aria-pressed={on || fixed}
            aria-label={`${label}${fixed ? ', blocked by the room' : on ? ', blocked' : ', open'}`}
            disabled={disabled || fixed}
            onClick={() => toggle(label)}
          >
            {label}
          </button>
        );
      }))}
    </div>
  );
}

// A read-only picture of a room's layout, for the "Add room" form: it redraws as the admin types.
export function SeatPreview({ rows, seatsPerRow }) {
  const r = Math.min(26, Math.max(0, Math.floor(rows) || 0));
  const c = Math.min(50, Math.max(0, Math.floor(seatsPerRow) || 0));
  if (!r || !c) return null;
  return (
    <figure className="seat-preview" aria-label={`Seat map preview: ${r} rows of ${c} seats, ${r * c} seats in total`}>
      <div className="seat-preview-screen" aria-hidden="true">Screen</div>
      <div className="seat-preview-grid" aria-hidden="true" style={{ '--seats': c }}>
        {Array.from({ length: r * c }, (_, index) => <span key={index} />)}
      </div>
      <figcaption>{r} rows × {c} seats = <b>{r * c} seats</b></figcaption>
    </figure>
  );
}
