import { Link } from 'react-router-dom';
import Home from './Home';
import { useAuth } from '../context/AuthContext';
import LandingFeatures from '../components/LandingFeatures';
import './Landing.css';
import './landingHero.css';

function SampleTicket() {
  return <div className="landing-ticket-stage" role="img" aria-label="Sample cinema ticket for illustration only. Not a booking or valid cinema ticket.">
    <div className="landing-ticket" aria-hidden="true">
      <div className="landing-ticket-banner"><span>SAMPLE TICKET</span><span>FILME CINEMA</span></div>
      <div className="landing-ticket-details">
        <p className="landing-ticket-notice">For illustration only — not a booking or valid cinema ticket.</p>
        <strong>Your movie title</strong>
        <dl className="landing-ticket-meta">
          <div><dt>Date</dt><dd>Select a date</dd></div>
          <div><dt>Time</dt><dd>Select a time</dd></div>
          <div><dt>Seats</dt><dd>Your seats</dd></div>
        </dl>
      </div>
      <div className="landing-ticket-bottom">
        <div className="landing-ticket-reference"><span>CODE</span><b>SAMPLE-ONLY</b></div>
        <strong>₱—</strong>
        <p className="landing-ticket-footer-copy">Choose a movie, pick your seats, and receive your ticket.</p>
      </div>
    </div>
  </div>;
}

export default function Landing() {
  const { user } = useAuth();
  return <div className="landing-page">
    {!user && <section className="landing-hero landing-container" aria-labelledby="landing-title"><div className="landing-hero-copy"><h1 id="landing-title">Your next cinema night starts here.</h1><p>Discover what's showing, choose your seats, and manage your tickets, all in one place.</p><div className="landing-hero-actions"><Link className="landing-button" to="/movies">Browse movies</Link><a className="landing-schedule-link" href="#todays-board">Explore showtimes below ↓</a></div></div><SampleTicket /></section>}
    <Home />
    {!user && <LandingFeatures />}
  </div>;
}
