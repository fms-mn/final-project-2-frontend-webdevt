import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="empty-state" style={{ minHeight: '60vh' }}>
      <div className="empty-state-icon">🎬</div>
      <h1 style={{ fontSize: '1.25rem' }}>Page not found</h1>
      <p>The page you were looking for doesn’t exist or has moved.</p>
      <Link className="btn btn-primary" to="/">Back to home</Link>
      <Link className="btn btn-secondary" to="/movies">Browse movies</Link>
    </div>
  );
}
