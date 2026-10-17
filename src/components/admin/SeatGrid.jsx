import ChairShape from '../ChairShape';
import './roomBlockedSeats.css';
import './seatGrid.css';

// A small seat chart for choosing seats to block. Seat labels are A1, A2, ... row by row.
// `locked` seats are blocked somewhere else (for example by the room) and cannot be toggled here.
export default function SeatGrid({ rows, seatsPerRow, selected, onChange, locked = [], disabled = false }) {
  const toggle = (label) => onChange(selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label].sort());
  return (
    <div className="showing-seat-map">
      <ul className="room-seat-legend" aria-label="Seat legend">
        <li><i aria-hidden="true" />Available</li>
        <li><i className="showing-seat-selected" aria-hidden="true">×</i>Blocked for this showing</li>
        <li><i className="blocked" aria-hidden="true">×</i>Blocked by room</li>
      </ul>
      <div className="room-seat-scroll" tabIndex={0} role="region" aria-label="Showing seat map; scroll horizontally to see all seats">
        <div className="room-seat-layout">
          <div className="room-seat-screen" aria-hidden="true"><span>SCREEN</span></div>
          <div className="room-seat-rows" role="group" aria-label="Seats">
            {Array.from({ length: rows }, (_, row) => {
              const rowName = String.fromCharCode(65 + row);
              return <div className="room-seat-row" key={rowName}>
                <span className="room-seat-row-name" aria-hidden="true">{rowName}</span>
                {Array.from({ length: seatsPerRow }, (__, seat) => {
                  const label = `${rowName}${seat + 1}`;
                  const fixed = locked.includes(label);
                  const on = selected.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`room-seat-chair${fixed ? ' is-blocked' : on ? ' showing-seat-selected' : ''}${seatsPerRow > 4 && seat === Math.ceil(seatsPerRow / 2) - 1 ? ' has-aisle' : ''}`}
                      aria-pressed={on || fixed}
                      aria-label={`${label}${fixed ? ', blocked by the room' : on ? ', blocked' : ', open'}`}
                      disabled={disabled || fixed}
                      onClick={() => toggle(label)}
                    >
                      <ChairShape label={label} />
                      {(on || fixed) && <span className="room-seat-mark" aria-hidden="true">×</span>}
                    </button>
                  );
                })}
                <span className="room-seat-row-name" aria-hidden="true">{rowName}</span>
              </div>;
            })}
          </div>
        </div>
      </div>
      <p className="room-seat-scroll-hint">Scroll sideways if the full row is not visible.</p>
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
        {Array.from({ length: r * c }, (_, index) => <span className="seat-preview-chair" key={index}><ChairShape /></span>)}
      </div>
      <figcaption>{r} rows × {c} seats = <b>{r * c} seats</b></figcaption>
    </figure>
  );
}
