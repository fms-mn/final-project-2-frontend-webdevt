import './landingFeatures.css';

const features = [
  { title: 'Choose your seats', description: 'See the screen layout and pick the seats you want.' },
  { title: 'Discover movies and schedules', description: "Find what's playing and when." },
  { title: 'Manage your tickets', description: 'View your tickets and cancel bookings when eligible.' },
];

export default function LandingFeatures() {
  return <section className="landing-features landing-container" id="how-it-works" tabIndex={-1} aria-labelledby="landing-features-title">
    <h2 id="landing-features-title">Built around how you watch.</h2>
    <div className="landing-feature-grid">{features.map((feature, index) => <article className="landing-feature" key={feature.title}><span className="landing-feature-number" aria-hidden="true">0{index + 1}</span><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div>
  </section>;
}
