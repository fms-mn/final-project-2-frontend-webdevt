import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ActionPending from '../components/ActionPending';
import BackToHome from '../components/BackToHome';
import PendingBookingNotice from '../components/PendingBookingNotice';
import { postAuthDestination } from '../utils/pendingBooking';
import { cleanCode, codeComplete } from '../utils/sessionMemory';
import './AuthForms.css';

export default function Login() {
  const { login, verifyLogin, resendLoginCode, sessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState(null); // set when a code was emailed: { challenge, email, expiresInMinutes }
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0); // seconds until another code can be asked for
  const [resent, setResent] = useState('');

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const goAfterLogin = (signedInUser) => {
    navigate(postAuthDestination(signedInUser, location.state?.from), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.verification) {
        setVerification(result.verification);
        setWait(result.verification.resendInSeconds || 60);
        setCode('');
        setPassword('');
        return;
      }
      goAfterLogin(result.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!codeComplete(code)) { setError('Enter the 6-digit code from the email.'); return; }
    setError('');
    setLoading(true);
    try {
      goAfterLogin(await verifyLogin(verification.challenge, cleanCode(code)));
    } catch (err) {
      setError(err.message || 'That code did not work');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResent('');
    try {
      const answer = await resendLoginCode(verification.challenge);
      setWait(answer.resendInSeconds || 60);
      setResent('A new code is on its way. The older one no longer works.');
    } catch (err) {
      setError(err.message || 'We could not send another code');
      if (err.status === 429) setWait(0);
    }
  };

  const startOver = () => { setVerification(null); setCode(''); setError(''); setResent(''); };

  if (verification) {
    return (
      <div className="auth-page auth-form-page">
        <div className="auth-container">
          <BackToHome />
          <div className="auth-card">
            <h1>Check your email</h1>
            <p className="subtitle">It has been a while since you last signed in, so we sent a 6-digit code to <strong>{verification.email}</strong>. It works for {verification.expiresInMinutes} minutes.</p>

            {error && <div className="error-message" role="alert">{error}</div>}
            {resent && !error && <div className="auth-notice" role="status">{resent}</div>}

            <form onSubmit={handleVerify}>
              <div className="form-group">
                <label htmlFor="code">Sign-in code</label>
                <input
                  id="code"
                  className="auth-code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={9}
                  value={code}
                  onChange={(e) => setCode(cleanCode(e.target.value))}
                  autoFocus
                  required
                />
                <p className="auth-form-helper">Not there? Look in your spam folder.</p>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
                <ActionPending pending={loading}>{loading ? 'Checking...' : 'Sign in'}</ActionPending>
              </button>
            </form>

            <div className="auth-footer auth-footer-split">
              <button type="button" className="auth-link-button" onClick={handleResend} disabled={wait > 0}>{wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}</button>
              <button type="button" className="auth-link-button" onClick={startOver}>Use a different account</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-form-page">
      <div className="auth-container">
        <BackToHome />
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in to your FILME account</p>
          <PendingBookingNotice />
          {sessionExpired && !error && <div className="auth-notice" role="status">Your session ended, so we signed you out to keep your account safe. Sign in again to carry on.</div>}
          {location.state?.notice && !error && <div className="auth-notice" role="status">{location.state.notice}</div>}

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
              <p className="auth-form-helper"><Link to="/forgot-password" state={{ email }}>Forgot your password?</Link></p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
              <ActionPending pending={loading}>{loading ? 'Signing in...' : 'Sign In'}</ActionPending>
            </button>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account? <Link to="/register" state={location.state}>Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
