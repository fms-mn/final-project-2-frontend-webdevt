import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import ActionPending from '../components/ActionPending';
import BackToHome from '../components/BackToHome';
import './AuthForms.css';

// Step one of getting back in: the email address. The answer is the same whether or not an account
// exists, so the page cannot be used to find out who has one.
export default function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setSentTo(email.trim());
    } catch (err) {
      setError(err.message || 'We could not send the email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-form-page">
      <div className="auth-container">
        <BackToHome />
        <div className="auth-card">
          {sentTo ? (
            <>
              <h1>Check your email</h1>
              <p className="subtitle">If <strong>{sentTo}</strong> belongs to an account, a link to choose a new password is on its way. It works for an hour, and only once.</p>
              <div className="auth-notice">No email after a few minutes? Look in your spam folder, or <button type="button" className="auth-link-button" onClick={() => setSentTo('')}>try another address</button>.</div>
              <div className="auth-footer"><Link to="/login">Back to sign in</Link></div>
            </>
          ) : (
            <>
              <h1>Forgot your password?</h1>
              <p className="subtitle">Enter the email you signed up with and we will send you a link to choose a new password.</p>
              {error && <div className="error-message" role="alert">{error}</div>}
              <form onSubmit={submit}>
                <div className="form-group">
                  <label htmlFor="forgot-email">Email</label>
                  <input id="forgot-email" type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
                  <ActionPending pending={loading}>{loading ? 'Sending...' : 'Send reset link'}</ActionPending>
                </button>
              </form>
              <div className="auth-footer">Remembered it? <Link to="/login">Sign in</Link></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
