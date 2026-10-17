import { createContext, useContext, useEffect, useState } from 'react';
import { api, forgetSession, UNAUTHORIZED_EVENT } from '../api';
import { endDemoSession, getDemoUser, startDemoSession, updateDemoUser } from '../data/demoAccount';
import { clearPendingBooking } from '../utils/pendingBooking';
import { forgetSignedIn, rememberSignedIn, wasSignedIn } from '../utils/sessionMemory';

const AuthContext = createContext();

// The API's user has `_id`; the rest of the app uses `id`.
const toUser = (user) => (user
  ? { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone }
  : null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we ask the server who is signed in
  const [sessionExpired, setSessionExpired] = useState(false); // was signed in, and the session ended by itself

  // On first load (and after a page refresh) ask the server whether the session cookie is valid.
  useEffect(() => {
    const demoUser = import.meta.env.DEV && getDemoUser();
    if (demoUser) {
      setUser(demoUser);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    api('/users/me', { signal: controller.signal })
      .then((data) => { rememberSignedIn(); setUser((current) => current?.isDemo ? current : toUser(data.user)); })
      .catch((error) => {
        if (error.name !== 'AbortError') setUser((current) => current?.isDemo ? current : null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  // The session ended while the site was open (api.js saw a 401).
  useEffect(() => {
    const handleExpired = () => {
      if (wasSignedIn()) { setSessionExpired(true); forgetSignedIn(); } // only someone who was signed in is told it ended
      setUser((current) => current?.isDemo ? current : null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleExpired);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleExpired);
  }, []);

  const finishSignIn = (data) => {
    if (import.meta.env.DEV) endDemoSession();
    const signedInUser = toUser(data.user);
    rememberSignedIn();
    setSessionExpired(false);
    setUser(signedInUser);
    return signedInUser;
  };

  // Step one: the password. Answers { user } when signed in, or { verification } when the account has been
  // away for a long time and a code was emailed (finish with verifyLogin).
  const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    if (data.verificationRequired) {
      const { challenge, email: maskedEmail, expiresInMinutes, resendInSeconds } = data;
      return { verification: { challenge, email: maskedEmail, expiresInMinutes, resendInSeconds } };
    }
    return { user: finishSignIn(data) };
  };

  const verifyLogin = async (challenge, code) => finishSignIn(await api('/auth/login/verify', { method: 'POST', body: { challenge, code } }));
  const resendLoginCode = (challenge) => api('/auth/login/resend', { method: 'POST', body: { challenge } });

  const register = async (name, email, password) => {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    if (import.meta.env.DEV) endDemoSession();
    const newUser = toUser(data.user);
    rememberSignedIn();
    setSessionExpired(false);
    setUser(newUser);
    return newUser;
  };

  const loginAsDemo = (role = 'user') => {
    if (!import.meta.env.DEV) throw new Error('Demo sign-in is available in local development only');
    const demoUser = startDemoSession(role);
    forgetSession();
    setUser(demoUser);
    setLoading(false);
    return demoUser;
  };

  const logout = async () => {
    clearPendingBooking();
    if (user?.isDemo) {
      endDemoSession();
      forgetSession();
      forgetSignedIn();
      setUser(null);
      return;
    }
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the request fails, sign out locally; the cookie expires on its own.
    }
    clearPendingBooking();
    forgetSession();
    forgetSignedIn();
    setUser(null);
  };

  // Saves the signed-in user's own name and phone (PATCH /api/users/me).
  const updateProfile = async (changes) => {
    if (user?.isDemo) {
      const updatedUser = updateDemoUser(changes);
      setUser(updatedUser);
      return updatedUser;
    }
    const data = await api('/users/me', { method: 'PATCH', body: changes });
    const updatedUser = toUser(data.user);
    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, login, verifyLogin, resendLoginCode, loginAsDemo, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
