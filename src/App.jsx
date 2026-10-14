import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BackToTop from './components/BackToTop';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import './App.css';
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './filme.css';
import './components/customerPageHeading.css';

function HomepageRedirect() {
  const location = useLocation();
  return <Navigate to={`/${location.search}${location.hash}`} replace state={location.state} />;
}

function AppContent() {
  const { loading, user } = useAuth();
  const isLanding = useLocation().pathname === '/';
  if (loading) return <div className="loading" style={{ minHeight: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="app">
      <Navbar />
      {user?.isDemo && <div className="demo-mode-banner" role="status"><strong>Demo mode — bookings are simulated</strong><span>{user.role === 'admin' ? 'Admin preview. Customer booking is disabled.' : 'Saved in this browser. No real tickets or payments.'}</span></div>}
      <main className={isLanding ? 'main-content landing-main' : 'main-content'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<HomepageRedirect />} />
          <Route path="/tonight" element={<HomepageRedirect />} />
          <Route path="/showtimes" element={<HomepageRedirect />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/my-bookings" element={<ProtectedRoute role="user"><MyBookings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute role="user"><Profile /></ProtectedRoute>} />
        </Routes>
      </main>
      <BackToTop />
      <footer className="footer"><div className="footer-content"><div className="footer-brand"><img src="/filme-mark.svg" alt="" /><strong>FILME</strong></div><p>Browse movies and manage your bookings. Test bookings are not valid for cinema admission.</p></div></footer>
    </div>
  );
}

function App() {
  return <AuthProvider><Router><AppContent /></Router></AuthProvider>;
}

export default App;
