import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BackToTop from './components/BackToTop';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
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

function RootEntry() {
  const { user } = useAuth();
  return user ? <Navigate to={user.role === 'admin' ? '/admin' : '/home'} replace /> : <Landing />;
}

function AppContent() {
  const { loading, user } = useAuth();
  const isLanding = useLocation().pathname === '/';
  if (loading) return <div className="loading" style={{ minHeight: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="app">
      {!isLanding && <Navbar />}
      {user?.isDemo && <div className="demo-mode-banner" role="status"><strong>Demo mode — bookings are simulated</strong><span>{user.role === 'admin' ? 'Admin preview. Customer booking is disabled.' : 'Saved in this browser. No real tickets or payments.'}</span></div>}
      <main className={isLanding ? 'landing-main' : 'main-content'}>
        <Routes>
          <Route path="/" element={<RootEntry />} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/tonight" element={<Navigate to="/home" replace />} />
          <Route path="/showtimes" element={<Navigate to="/home" replace />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movie/:id" element={<ProtectedRoute><MovieDetail /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/my-bookings" element={<ProtectedRoute role="user"><MyBookings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute role="user"><Profile /></ProtectedRoute>} />
        </Routes>
      </main>
      {!isLanding && <BackToTop />}
      {!isLanding && <footer className="footer"><div className="footer-content"><div className="footer-brand"><img src="/filme-mark.svg" alt="" /><strong>FILME</strong></div><p>{user?.isDemo ? 'Demo bookings are simulated and cannot be used for cinema admission.' : 'Pick a film, choose your seats, show your code at the door.'}</p></div></footer>}
    </div>
  );
}

function App() {
  return <AuthProvider><Router><AppContent /></Router></AuthProvider>;
}

export default App;
