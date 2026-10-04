import { createContext, useContext, useState } from 'react';
import {
  getCurrentUser,
  loginDemoUser,
  logoutDemoUser,
  registerDemoUser,
} from '../data/demoAuth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser);

  const login = async (email, password) => {
    const signedInUser = await loginDemoUser(email, password);
    setUser(signedInUser);
    return signedInUser;
  };

  const register = async (name, email, password) => {
    const newUser = await registerDemoUser(name, email, password);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    logoutDemoUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
