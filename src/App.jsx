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
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import './App.css';
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './filme.css';

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
                element={<ProtectedRoute role="user"><MyBookings /></ProtectedRoute>}
              />
              <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute role="user"><Profile /></ProtectedRoute>} />
            </Routes>
          </main>
          <BackToTop />
          <footer className="footer"><div className="footer-content"><div className="footer-brand"><img src="/filme-mark.svg" alt="" /><strong>FILME</strong></div><p>Pick a film, choose your seats, show your code at the door.</p></div></footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
