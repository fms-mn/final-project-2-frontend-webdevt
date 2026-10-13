import { useEffect, useRef, useState } from 'react';
import './promoMarquee.css';

const phrases = ['NOW SHOWING', 'CHOOSE YOUR SEATS', 'DIGITAL TICKETS'];
const SPEED = 42;

export default function PromoMarquee() {
  const viewport = useRef(null);
  const sequence = useRef(null);
  const [metrics, setMetrics] = useState({ width: 0, copies: 2 });

  useEffect(() => {
    const measure = () => {
      const width = sequence.current.getBoundingClientRect().width;
      if (!width) return;
      const copies = Math.max(2, Math.ceil(viewport.current.clientWidth / width) + 1);
      setMetrics(previous => previous.width === width && previous.copies === copies ? previous : { width, copies });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current);
    observer.observe(sequence.current);
    measure();
    return () => observer.disconnect();
  }, []);

  return <div className="landing-ribbon">
    <span className="promo-readable">NOW SHOWING ★ CHOOSE YOUR SEATS ★ DIGITAL TICKETS</span>
    <div ref={viewport} className="promo-viewport" aria-hidden="true">
      <div className="promo-track" data-ready={metrics.width > 0} style={{ '--promo-distance': `${metrics.width}px`, '--promo-duration': `${metrics.width / SPEED}s` }}>
        {Array.from({ length: metrics.copies }, (_, index) => <div key={index} ref={index === 0 ? sequence : null} className="promo-sequence">{phrases.map(phrase => <span className="promo-phrase" key={phrase}>{phrase}<span className="promo-star">★</span></span>)}</div>)}
      </div>
    </div>
  </div>;
}
