import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="nav-brand">
        🎬 CineMax
      </Link>

      <div className="nav-links">
        <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
          Home
        </Link>
        <Link to="/movies" className={`nav-link ${isActive('/movies') ? 'active' : ''}`}>
          Movies
        </Link>
        {user && (
          <Link
            to="/my-bookings"
            className={`nav-link ${isActive('/my-bookings') ? 'active' : ''}`}
          >
            My Bookings
          </Link>
        )}
      </div>

      <div className="nav-user">
        {user ? (
          <>
            <span className="nav-user-name">Hi, {user.name}</span>
            <button className="nav-logout" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-btn">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
