import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_ACCOUNTS } from '../data/demoAuth';

export default function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const signedInUser = await login(email, password);
      const destination = location.state?.from;
      navigate(destination && (signedInUser.role === 'admin' ? destination.pathname.startsWith('/admin') : !destination.pathname.startsWith('/admin'))
        ? `${destination.pathname}${destination.search}${destination.hash}`
        : signedInUser.role === 'admin' ? '/admin' : '/', {
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page fade-in">
      <div className="auth-container">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in to your FILME demo account on this browser</p>

          {error && <div className="error-message">{error}</div>}

          <div className="demo-account-actions">
            {DEMO_ACCOUNTS.map((account) => (
              <button key={account.id} type="button" className="btn btn-secondary btn-small" onClick={() => {
                setEmail(account.email); setPassword(account.password); setError('');
              }}>
                Use demo {account.role}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account? <Link to="/register">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
