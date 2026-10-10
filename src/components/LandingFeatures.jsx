import { useEffect, useRef, useState } from 'react';
import { FiPause, FiPlay } from 'react-icons/fi';
import './landingFeaturesMotion.css';

const features = [
  { title: 'Choose your seats', description: 'See the screen layout and pick the seats you want.' },
  { title: 'Discover movies and schedules', description: "Find what's playing and when." },
  { title: 'Manage your tickets', description: 'View your tickets and cancel bookings when eligible.' },
];

export default function LandingFeatures() {
  const grid = useRef(null);
  const [visible, setVisible] = useState(false);
  const [tabActive, setTabActive] = useState(() => document.visibilityState === 'visible');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(grid.current);
    const updateVisibility = () => setTabActive(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  return <section className="landing-features landing-container" id="how-it-works" tabIndex={-1} aria-labelledby="landing-features-title" data-wave-running={visible && tabActive && !paused}>
    <h2 id="landing-features-title">Built around how you watch.</h2>
    <div ref={grid} className="landing-feature-grid">{features.map((feature, index) => <div className="landing-feature-lift" style={{ '--wave-delay': `${index * 0.5}s` }} key={feature.title}><article className={`landing-feature landing-feature-${index + 1}`}><span className="landing-feature-number" aria-hidden="true">0{index + 1}</span><h3>{feature.title}</h3><p>{feature.description}</p></article></div>)}</div>
    <button type="button" className="landing-features-motion" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? 'Resume feature card animations' : 'Pause feature card animations'}>{paused ? <FiPlay aria-hidden="true" /> : <FiPause aria-hidden="true" />}<span>{paused ? 'Resume animations' : 'Pause animations'}</span></button>
  </section>;
}
