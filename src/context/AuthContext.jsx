import { createContext, useContext, useState } from 'react';
import {
  getCurrentUser,
  loginDemoUser,
  logoutDemoUser,
  registerDemoUser,
  updateDemoCustomerProfile,
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

  const updateProfile = (changes) => {
    if (!user || user.role !== 'customer') throw new Error('Sign in as a customer to edit your profile');
    const updatedUser = updateDemoCustomerProfile(user.id, changes);
    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
