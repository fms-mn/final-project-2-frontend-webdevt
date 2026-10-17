import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ActionPending from '../components/ActionPending';
import BackToHome from '../components/BackToHome';
import './AuthForms.css';

// The page the emailed link opens: it checks the link first, then asks for a new password.
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [state, setState] = useState(token ? 'checking' : 'dead'); // checking | ready | dead
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let current = true;
    api('/auth/reset-password/check', { method: 'POST', body: { token } })
      .then((answer) => { if (current) setState(answer.valid ? 'ready' : 'dead'); })
      .catch(() => { if (current) setState('ready'); }); // cannot tell: let them try, the server decides
    return () => { current = false; };
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== again) { setError('The two passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      navigate('/login', { replace: true, state: { notice: 'Your password was changed. Sign in with the new one.' } });
    } catch (err) {
      setError(err.message || 'We could not change your password. Please try again.');
      if (err.status === 400 && /link/i.test(err.message || '')) setState('dead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-form-page">
      <div className="auth-container">
        <BackToHome />
        <div className="auth-card">
          {state === 'checking' && <div className="loading" role="status" aria-label="Checking your link"><div className="spinner" aria-hidden="true" /></div>}
          {state === 'dead' && (
            <>
              <h1>This link no longer works</h1>
              <p className="subtitle">Reset links expire after an hour and only work once. Ask for a new one and use it right away.</p>
              <Link className="btn btn-primary" to="/forgot-password">Send me a new link</Link>
              <div className="auth-footer"><Link to="/login">Back to sign in</Link></div>
            </>
          )}
          {state === 'ready' && (
            <>
              <h1>Choose a new password</h1>
              <p className="subtitle">You will be signed out of every device, then sign in with the new password.</p>
              {error && <div className="error-message" role="alert">{error}</div>}
              <form onSubmit={submit}>
                <div className="form-group">
                  <label htmlFor="new-password">New password</label>
                  <div className="auth-form-password">
                    <input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" aria-describedby="new-password-help" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required />
                    <button type="button" className="auth-form-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="new-password" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? 'Hide' : 'Show'}</button>
                  </div>
                  <p id="new-password-help" className="auth-form-helper">At least 8 characters.</p>
                </div>
                <div className="form-group">
                  <label htmlFor="new-password-again">Type it again</label>
                  <input id="new-password-again" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={again} onChange={(event) => setAgain(event.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
                  <ActionPending pending={loading}>{loading ? 'Saving...' : 'Change password'}</ActionPending>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
