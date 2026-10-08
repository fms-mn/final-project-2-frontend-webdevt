import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMoon, FiSun } from 'react-icons/fi';
import { demoMovies } from '../data/demoMovies';
import './Landing.css';

function CinemaIllustration() {
  const seats = [0, 1, 2, 3, 4, 5];
  return <svg className="landing-cinema-art" viewBox="0 0 1200 630" role="img" aria-labelledby="landing-cinema-title" preserveAspectRatio="xMidYMid meet">
    <title id="landing-cinema-title">A cinema screen, rows of seats, and a movie ticket</title>
    <defs>
      <linearGradient id="landing-screen" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f3e6f4" /><stop offset="1" stopColor="#ffc0cb" /></linearGradient>
      <linearGradient id="landing-ticket" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#faf9ff" /><stop offset="1" stopColor="#ebeaff" /></linearGradient>
      <filter id="landing-screen-glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="10" /></filter>
    </defs>
    <rect width="1200" height="630" rx="24" fill="#1b2050" />
    <path d="M340 240H850L1170 630H30Z" fill="#41305e" opacity=".76" />
    <rect x="225" y="54" width="630" height="188" rx="14" fill="#ffc0cb" opacity=".16" filter="url(#landing-screen-glow)" />
    <rect x="225" y="54" width="630" height="188" rx="14" fill="url(#landing-screen)" />
    <path d="M202 258H879" stroke="#414c9b" strokeWidth="12" strokeLinecap="round" />
    {seats.map(index => <g key={`back-${index}`} transform={`translate(${197 + index * 150} 383)`} fill="#3b4b9b"><rect width="52" height="45" rx="13" /><path d="M9 11Q26 6 43 11" fill="none" stroke="#6b78bc" strokeWidth="2" opacity=".5" /><rect x="-4" y="34" width="60" height="21" rx="8" fill="#34428d" /><rect x="-9" y="25" width="12" height="28" rx="5" /><rect x="49" y="25" width="12" height="28" rx="5" /></g>)}
    {seats.map(index => <g key={`front-${index}`} transform={`translate(${167 + index * 159} 497)`} fill="#ff657d"><rect width="72" height="57" rx="17" /><path d="M12 12Q36 6 60 12" fill="none" stroke="#ffb1bf" strokeWidth="3" opacity=".5" /><rect x="-7" y="46" width="86" height="26" rx="10" fill="#ed5671" /><rect x="-13" y="35" width="16" height="39" rx="6" /><rect x="69" y="35" width="16" height="39" rx="6" /></g>)}
    <g transform="translate(932 158) rotate(8 110 62)">
      <rect x="0" y="0" width="224" height="124" rx="15" fill="url(#landing-ticket)" />
      <circle cx="0" cy="62" r="13" fill="#1b2050" /><circle cx="224" cy="62" r="13" fill="#1b2050" />
      <rect x="26" y="25" width="105" height="13" rx="6" fill="#1b2050" />
      <rect x="157" y="27" width="44" height="24" rx="12" fill="#ff657d" />
      <rect x="26" y="55" width="151" height="9" rx="5" fill="#9d91df" />
      <rect x="26" y="77" width="91" height="9" rx="5" fill="#9d91df" />
    </g>
  </svg>;
}

function SeatPreview() {
  return <div className="landing-preview landing-seat-preview" aria-hidden="true"><div className="landing-seat-grid">
    {Array.from({ length: 24 }, (_, index) => <span key={index} className={`landing-preview-chair ${[8, 9, 14, 15].includes(index) ? 'occupied' : [20, 21].includes(index) ? 'selected' : ''}`}><i className="landing-preview-backrest" /><i className="landing-preview-cushion" /></span>)}
  </div></div>;
}

function SchedulePreview() {
  const times = ['7:30 PM', '9:45 PM', '11:00 AM'];
  return <div className="landing-preview landing-schedule-preview" aria-hidden="true">{demoMovies.slice(0, 3).map((movie, index) => <div className="landing-schedule-row" key={movie._id}><img className="landing-mini-poster" src={movie.posterUrl} alt="" /><strong className="landing-schedule-title">{movie.title}</strong><span className="landing-schedule-time">{times[index]}</span></div>)}</div>;
}

function TicketPreview() {
  return <div className="landing-preview landing-ticket-preview" aria-hidden="true">
    <div className="landing-ticket-mini">
      <div className="landing-ticket-banner"><span>NEXT UP · TODAY</span><span>CINEMA</span></div>
      <div className="landing-ticket-content">
        <strong className="landing-ticket-title">Midnight Signal</strong>
        <div className="landing-ticket-meta">
          <span><small>Date</small> <b>Thu, Oct 8</b></span>
          <span><small>Time</small> <b>21:30</b></span>
          <span><small>Seats</small> <b>A7, A6</b></span>
        </div>
        <div className="landing-ticket-bottom">
          <div className="landing-ticket-code"><small>CODE</small><span>FLM-C191196E</span></div>
          <strong className="landing-ticket-price">₱800</strong>
          <span className="landing-ticket-cancel">Cancel ticket</span>
        </div>
      </div>
    </div>
  </div>;
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
    <header className="landing-header"><div className="landing-header-inner">
      <Link className="landing-brand" to="/" aria-label="FILME home"><img src="/filme-mark.svg" alt="" />FILME</Link>
      <nav className="landing-header-nav" aria-label="Landing navigation"><a href="#how-it-works">How It Works</a><Link to="/login">Log In</Link><button type="button" className="landing-theme-toggle" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>{theme === 'light' ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}</button></nav>
    </div></header>

    <section className="landing-hero" aria-labelledby="landing-title"><div className="landing-hero-inner">
      <h1 id="landing-title">Your next cinema experience <span className="landing-headline-ending">starts here.</span></h1>
      <p>Discover what&apos;s showing, choose your seats, and manage your tickets, all in one place.</p>
      <div className="landing-hero-actions"><Link className="landing-button landing-button-primary" to="/register">Create Account</Link><a className="landing-button landing-button-outline" href="#how-it-works">How It Works</a></div>
      <CinemaIllustration />
    </div></section>

    <section className="landing-steps-section" id="how-it-works" tabIndex={-1} aria-label="How it works"><div className="landing-container"><ol className="landing-steps">
      <li><span className="landing-step-number">1</span><div><h2>Create an account</h2><p>Sign up in a minute to get started.</p></div></li>
      <li><span className="landing-step-number">2</span><div><h2>Choose a movie and seats</h2><p>Browse what&apos;s showing and pick where you sit.</p></div></li>
      <li><span className="landing-step-number">3</span><div><h2>Receive your ticket</h2><p>Your digital ticket is ready right after you book.</p></div></li>
    </ol></div></section>

    <section className="landing-features" aria-labelledby="landing-features-title"><div className="landing-container">
      <div className="landing-features-heading"><h2 id="landing-features-title">Built around how you watch</h2><p>Seats, schedules, and tickets, all in one place.</p></div>
      <div className="landing-feature-grid">
        <article className="landing-feature"><SeatPreview /><h3>Choose your seats</h3><p>See the screen layout and pick the seats you want.</p></article>
        <article className="landing-feature"><SchedulePreview /><h3>Discover movies and schedules</h3><p>Find what&apos;s playing and when.</p></article>
        <article className="landing-feature"><TicketPreview /><h3>Manage your tickets</h3><p>View your tickets and cancel bookings when eligible.</p></article>
      </div>
    </div></section>

    <section className="landing-closing" aria-labelledby="landing-closing-title"><h2 id="landing-closing-title">Ready for your next movie?</h2><p>Create your free FILME account and book in a few taps.</p><Link className="landing-button landing-button-primary" to="/register">Create Account</Link></section>

    <footer className="landing-footer"><div className="landing-container landing-footer-inner"><Link className="landing-brand" to="/" aria-label="FILME home"><img src="/filme-mark.svg" alt="" />FILME</Link><nav aria-label="Footer navigation"><a href="#how-it-works">How It Works</a><Link to="/login">Log In</Link></nav><small>© FILME</small></div></footer>
  </div>;
}
