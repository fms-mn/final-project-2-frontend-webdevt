import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import BackToTop from './components/BackToTop';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/movie/:id" element={<MovieDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/my-bookings"
                element={<ProtectedRoute><MyBookings /></ProtectedRoute>}
              />
            </Routes>
          </main>
          <BackToTop />
          <footer className="footer">
            <div className="footer-content">
              <div className="footer-brand">
                <h3>🎬 FILME</h3>
                <p>Your premium movie experience</p>
              </div>
              <div className="footer-links">
                <a href="/movies">Movies</a>
                <a href="#">About</a>
                <a href="#">Contact</a>
                <a href="#">Terms</a>
              </div>
              <p className="footer-copy">&copy; 2026 FILME. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
