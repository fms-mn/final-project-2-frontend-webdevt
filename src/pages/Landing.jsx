import { Link } from 'react-router-dom';
import Home from './Home';
import LandingTicket from '../components/LandingTicket';
import { useMovies } from '../hooks/useMovies';
import { pickFeatured } from '../utils/featured';
import { useAuth } from '../context/AuthContext';
import './Landing.css';
import './landingHero.css';
import './homeTheme.css';
import '../components/landingTicket.css';

// The headline and the ticket. A separate component, so the movie list is only fetched for visitors
// who actually see the hero (signed-out ones).
function Hero() {
  const { movies } = useMovies();
  return <section className="landing-hero landing-container" aria-labelledby="landing-title"><div className="landing-hero-copy"><h1 id="landing-title">Your next cinema night starts here.</h1><p>Discover what's showing, choose your seats, and manage your tickets, all in one place.</p><div className="landing-hero-actions"><Link className="landing-button" to="/movies">Browse movies</Link><a className="landing-schedule-link" href="#todays-board">Explore showtimes below ↓</a></div></div><LandingTicket movie={pickFeatured(movies)} /></section>;
}

export default function Landing() {
  const { user } = useAuth();
  return <div className="landing-page">
    {!user && <Hero />}
    <Home />
  </div>;
}
