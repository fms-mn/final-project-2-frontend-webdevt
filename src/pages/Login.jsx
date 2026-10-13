import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ActionPending from '../components/ActionPending';
import BackToHome from '../components/BackToHome';
import './AuthForms.css';

export default function Login() {
  const { login, loginAsDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const goAfterLogin = (signedInUser) => {
    const destination = location.state?.from;
    navigate(destination && (signedInUser.role === 'admin' ? destination.pathname.startsWith('/admin') : !destination.pathname.startsWith('/admin'))
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : signedInUser.role === 'admin' ? '/admin' : '/home', {
      replace: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const signedInUser = await login(email, password);
      goAfterLogin(signedInUser);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role) => {
    setError('');
    try {
      goAfterLogin(loginAsDemo(role));
    } catch (err) {
      setError(err.message || 'Demo sign-in failed');
    }
  };

  return (
    <div className="auth-page auth-form-page">
      <div className="auth-container">
        <BackToHome />
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in to your FILME account</p>

          {error && <div className="error-message" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="auth-form-password">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="auth-form-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="password" onClick={() => setShowPassword(visible => !visible)}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
              <ActionPending pending={loading}>{loading ? 'Signing in...' : 'Sign In'}</ActionPending>
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="demo-login">
              <p>Preview either side of FILME without starting the database.</p>
              <button type="button" className="btn btn-secondary" onClick={() => handleDemoLogin('user')} disabled={loading}>
                Continue as Demo User
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => handleDemoLogin('admin')} disabled={loading}>
                View Demo Admin
              </button>
            </div>
          )}

          <div className="auth-footer">
            Don&apos;t have an account? <Link to="/register">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
