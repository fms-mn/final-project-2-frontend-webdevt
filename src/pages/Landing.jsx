import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMoon, FiSun } from 'react-icons/fi';
import PromoMarquee from '../components/PromoMarquee';
import LandingFeatures from '../components/LandingFeatures';
import './Landing.css';
import '../components/landingTicketMotion.css';

function SampleTicket() {
  return <div className="landing-ticket-stage"><div className="landing-ticket-hover"><div className="landing-ticket-float" role="img" aria-label="Sample Midnight Signal cinema ticket: Thursday October 8, 21:30, seats A7 and A6, 800 pesos"><div className="landing-ticket" aria-hidden="true">
    <div className="landing-ticket-banner"><span>NEXT UP · TODAY</span><span>CINEMA</span></div>
    <div className="landing-ticket-details"><strong>Midnight Signal</strong><div className="landing-ticket-meta"><span><small>Date</small><b>Thu, Oct 8</b></span><span><small>Time</small><b>21:30</b></span><span><small>Seats</small><b>A7, A6</b></span></div></div>
    <div className="landing-ticket-bottom"><span>FLM-C191196E</span><strong>₱800</strong></div>
    <div className="landing-ticket-shine" aria-hidden="true" />
  </div></div></div></div>;
}
function CreateAccount({ closing = false }) {
  return <Link className={`landing-button${closing ? ' landing-button-paper' : ''}`} to="/register">Create Account <span aria-hidden="true">→</span></Link>;
}
export default function Landing() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      try { if (['light', 'dark'].includes(localStorage.getItem('filme_theme'))) return; } catch { /* Follow the device preference. */ }
      const next = preference.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem('filme_theme', next); } catch { /* The page still follows the selected theme. */ }
  };
  return <div className="landing-page">
    <header className="landing-header landing-container">
      <Link className="landing-brand" to="/" aria-label="FILME home"><img src="/filme-mark.svg" alt="" /><span>FILME</span></Link>
      <nav className="landing-header-nav" aria-label="Landing navigation"><a href="#how-it-works">How It Works</a><Link to="/login">Log In</Link><button type="button" className="landing-theme-toggle" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>{theme === 'light' ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}</button></nav>
    </header>
    <section className="landing-hero landing-container" aria-labelledby="landing-title"><div className="landing-hero-copy"><h1 id="landing-title"><span>Your next</span><span><mark>cinema</mark></span><span>night starts</span><span>here.</span></h1><p>Discover what's showing, choose your seats, and manage your tickets, all in one place.</p><CreateAccount /></div><SampleTicket /></section>
    <PromoMarquee />
    <LandingFeatures />
    <section className="landing-closing" aria-labelledby="landing-closing-title"><div className="landing-container"><h2 id="landing-closing-title">Ready for your next movie?</h2><p>Create your free FILME account and book in a few taps.</p><CreateAccount closing /></div></section>
    <footer className="landing-footer landing-container"><Link className="landing-footer-brand" to="/" aria-label="FILME home">FILME</Link><nav aria-label="Footer navigation"><a href="#how-it-works">How It Works</a><Link to="/login">Log In</Link></nav><small>© FILME</small></footer>
  </div>;
}
