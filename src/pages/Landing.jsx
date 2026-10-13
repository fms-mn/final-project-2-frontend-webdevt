import { Link } from 'react-router-dom';
import Home from './Home';
import PromoMarquee from '../components/PromoMarquee';
import LandingFeatures from '../components/LandingFeatures';
import './Landing.css';
import '../components/landingTicketMotion.css';

function SampleTicket() {
  return <div className="landing-ticket-stage"><div className="landing-ticket-hover"><div className="landing-ticket-float" role="img" aria-label="Sample cinema ticket illustration"><div className="landing-ticket" aria-hidden="true">
    <div className="landing-ticket-banner"><span>SAMPLE TICKET</span><span>CINEMA</span></div>
    <div className="landing-ticket-details"><strong>Midnight Signal</strong><div className="landing-ticket-meta"><span><small>Date</small><b>Thu, Oct 8</b></span><span><small>Time</small><b>21:30</b></span><span><small>Seats</small><b>A7, A6</b></span></div></div>
    <div className="landing-ticket-bottom"><span>FLM-C191196E</span><strong>₱800</strong></div>
    <div className="landing-ticket-shine" aria-hidden="true" />
  </div></div></div></div>;
}

export default function Landing() {
  return <div className="landing-page">
    <section className="landing-hero landing-container" aria-labelledby="landing-title"><div className="landing-hero-copy"><h1 id="landing-title"><span>Your next</span><span><mark>cinema</mark></span><span>night starts</span><span>here.</span></h1><p>Discover what's showing, choose your seats, and manage your tickets, all in one place.</p><div className="landing-hero-actions"><Link className="landing-button" to="/movies">Browse movies <span aria-hidden="true">→</span></Link><a className="landing-schedule-link" href="#todays-board">Explore showtimes below ↓</a></div></div><SampleTicket /></section>
    <Home />
    <PromoMarquee />
    <LandingFeatures />
  </div>;
}
