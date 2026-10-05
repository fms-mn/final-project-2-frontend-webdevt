import { createContext, useContext, useEffect, useState } from 'react';
import { api, forgetSession, UNAUTHORIZED_EVENT } from '../api';

const AuthContext = createContext();

// The API's user has `_id`; the rest of the app uses `id`.
const toUser = (user) => (user
  ? { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone }
  : null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we ask the server who is signed in

  // On first load (and after a page refresh) ask the server whether the session cookie is valid.
  useEffect(() => {
    const controller = new AbortController();
    api('/users/me', { signal: controller.signal })
      .then((data) => setUser(toUser(data.user)))
      .catch((error) => {
        if (error.name !== 'AbortError') setUser(null); // 401 simply means "not signed in"
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  // The session ended while the site was open (api.js saw a 401).
  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handleExpired);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleExpired);
  }, []);

  const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    const signedInUser = toUser(data.user);
    setUser(signedInUser);
    return signedInUser;
  };

  const register = async (name, email, password) => {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    const newUser = toUser(data.user);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the request fails, sign out locally; the cookie expires on its own.
    }
    forgetSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
