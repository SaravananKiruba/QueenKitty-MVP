import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, clearToken } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: if a token exists, fetch /auth/me. Otherwise skip.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const data = await api.get('/auth/me');
        if (!cancelled) setUser(data.user);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (phone, password) => {
    const data = await api.post('/auth/login', { phone, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await api.post('/auth/signup', payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
