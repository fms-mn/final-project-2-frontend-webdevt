import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { FiMenu, FiMoon, FiSun, FiX } from 'react-icons/fi';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const isActive = (path) => location.pathname === path;
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem('filme_theme', nextTheme);
    } catch {
      // The selected theme still applies for this session if storage is unavailable.
    }
    setTheme(nextTheme);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="nav-brand">
        🎬 FILME
      </Link>

      <div id="primary-navigation" className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/') ? 'active' : ''}`}>
          Home
        </Link>
        <Link to="/movies" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/movies') ? 'active' : ''}`}>
          Movies
        </Link>
        {user?.role === 'user' && (
          <>
            <Link to="/my-bookings" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/my-bookings') ? 'active' : ''}`}>My Bookings</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
          </>
        )}
        {user?.role === 'admin' && <Link to="/admin" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Dashboard</Link>}
        <div className="nav-mobile-account">
          {loading ? null : user ? <>
            <span className="nav-mobile-name">Hi, {user.name}</span>
            <button type="button" className="nav-logout" onClick={() => { setMenuOpen(false); logout(); }}>Logout</button>
          </> : <Link to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>Sign In</Link>}
        </div>
      </div>

      <div className="nav-user">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        {loading ? null : user ? (
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
      <button type="button" className="nav-menu-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}>
        {menuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
      </button>
    </nav>
  );
}
