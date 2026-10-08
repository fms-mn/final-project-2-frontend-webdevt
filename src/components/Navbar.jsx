import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { FiMenu, FiMoon, FiSun, FiX } from 'react-icons/fi';
import ActionPending from './ActionPending';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  useEffect(() => {
    const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const followDevice = () => {
      try {
        if (localStorage.getItem('filme_theme') === 'light' || localStorage.getItem('filme_theme') === 'dark') return;
      } catch { /* Device preference remains available when storage is blocked. */ }
      const nextTheme = deviceTheme.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
    };
    deviceTheme.addEventListener('change', followDevice);
    return () => deviceTheme.removeEventListener('change', followDevice);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    try { localStorage.setItem('filme_theme', nextTheme); } catch { /* The current choice still applies. */ }
  };

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await logout();
    navigate('/', { replace: true });
    setSigningOut(false);
    setMenuOpen(false);
  };

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
  const homePath = user?.role === 'admin' ? '/admin' : user ? '/home' : '/';
  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to={['/login', '/register'].includes(location.pathname) ? '/' : homePath} className="nav-brand" aria-label="FILME home"><img src="/filme-mark.svg" alt="" />FILME</Link>

      <div id="primary-navigation" className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
        {user?.role === 'user' && (
          <>
            <Link to="/home" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/home') ? 'active' : ''}`}>Home</Link>
            <Link to="/movies" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/movies') ? 'active' : ''}`}>Movies</Link>
            <Link to="/my-bookings" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/my-bookings') ? 'active' : ''}`}>My Tickets</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
          </>
        )}
        {user?.role === 'admin' && (
          <>
            <Link to="/home" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/home') ? 'active' : ''}`}>Customer View</Link>
            <Link to="/movies" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/movies') ? 'active' : ''}`}>All movies</Link>
            <Link to="/admin" onClick={() => setMenuOpen(false)} className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Dashboard</Link>
          </>
        )}
        <div className="nav-mobile-account">
          {loading ? null : user ? <>
            <span className="nav-mobile-name">Hi, {user.name}</span>
            <button type="button" className="nav-logout" disabled={signingOut} aria-busy={signingOut} onClick={handleLogout}><ActionPending pending={signingOut}>{signingOut ? 'Signing out...' : 'Logout'}</ActionPending></button>
          </> : null}
        </div>
      </div>

      <div className="nav-user">
        {loading ? null : user ? (
          <>
            <span className="nav-user-name">{user.name}</span>
            <span className="nav-avatar">{user.name.split(/\s+/).map(part => part[0]).slice(0,2).join('').toUpperCase()}</span>
            <button type="button" className="nav-logout" disabled={signingOut} aria-busy={signingOut} onClick={handleLogout}>
              <ActionPending pending={signingOut}>{signingOut ? 'Signing out...' : 'Log out'}</ActionPending>
            </button>
          </>
        ) : null}
        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          {theme === 'light' ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}
        </button>
      </div>
      {user && <button type="button" className="nav-menu-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}>
        {menuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
      </button>}
    </nav>
  );
}
