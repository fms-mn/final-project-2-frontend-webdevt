import { useState } from 'react';
import { sparseLabels } from '../../utils/adminTools';

const WIDTH = 620;
const HEIGHT = 210;
const PAD = 22;

// A simple revenue line. `points` is [{ label, value }]; values are plain numbers.
export default function LineChart({ points, summary }) {
  const [keyboardTip, setKeyboardTip] = useState(null);
  if (points.length === 0) return null;
  const values = points.map((point) => point.value);
  const top = Math.max(...values, 1);
  const x = (index) => PAD + (index * (WIDTH - PAD * 2)) / Math.max(points.length - 1, 1);
  const y = (value) => HEIGHT - PAD - (value / top) * (HEIGHT - PAD * 2);
  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const labels = sparseLabels(points.map((point) => point.label));

  return (
    <div className="admin-line-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
        {[0, 1, 2, 3].map((n) => {
          const gridY = PAD + (n * (HEIGHT - PAD * 2)) / 3;
          return <line key={n} x1={PAD} x2={WIDTH - PAD} y1={gridY} y2={gridY} className="chart-grid-line" />;
        })}
        <polygon points={`${x(0)},${HEIGHT - PAD} ${line} ${x(points.length - 1)},${HEIGHT - PAD}`} className="chart-area" />
        <polyline points={line} className="chart-line" />
        {points.length <= 31 && points.map((point, index) => (
          <circle key={point.label + index} cx={x(index)} cy={y(point.value)} r="4" className="chart-dot" tabIndex={0} aria-label={`${point.label}: ${point.tip}`} onFocus={() => setKeyboardTip(`${point.label}: ${point.tip}`)} onBlur={() => setKeyboardTip(null)}><title>{`${point.label}: ${point.tip}`}</title></circle>
        ))}
      </svg>
      <div className="chart-labels" style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }} aria-hidden="true">
        {labels.map((label, index) => <span key={index}>{label}</span>)}
      </div>
      {keyboardTip && <span className="chart-keyboard-tooltip" role="status">{keyboardTip}</span>}
    </div>
  );
}
