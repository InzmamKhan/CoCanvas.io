import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(api.getUser());
  const [token, setToken] = useState(api.getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = api.getToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res && res.user) {
          setUser(res.user);
          api.setUser(res.user);
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        api.logout();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  const login = async (emailOrUsername, password) => {
    const res = await api.login(emailOrUsername, password);
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const register = async (username, email, password) => {
    const res = await api.register(username, email, password);
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
