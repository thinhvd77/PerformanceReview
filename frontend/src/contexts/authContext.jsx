import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const isAdmin = useMemo(() => (user?.role || '').toLowerCase() === 'admin', [user]);
  const isManager = useMemo(() => (user?.role || '').toLowerCase() === 'manager', [user]);
  const isEmployee = useMemo(() => (user?.role || '').toLowerCase() === 'employee', [user]);

  // Keep state in sync with localStorage changes and validate tokens periodically
  useEffect(() => {
    const validateAuth = () => {
      const currentToken = authService.getToken();
      const currentUser = authService.getCurrentUser();
      const authenticated = authService.isAuthenticated();
      
      setUser(currentUser);
      setToken(currentToken);
      setIsAuthenticated(authenticated);
    };

    const onStorage = (e) => {
      if (e.key === 'user' || e.key === 'token') {
        validateAuth();
      }
    };

    // Initial validation
    validateAuth();

    // Listen for storage changes
    window.addEventListener('storage', onStorage);

    // Periodic token validation (every 5 minutes)
    const tokenValidationInterval = setInterval(() => {
      if (token && !authService.isValidToken(token)) {
        logout();
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(tokenValidationInterval);
    };
  }, [token]);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    const newUser = authService.getCurrentUser();
    const newToken = authService.getToken();
    setUser(newUser);
    setToken(newToken);
    setIsAuthenticated(true);
    return { data, user: newUser };
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(() => ({ 
    user, 
    token, 
    isAuthenticated,
    isAdmin, 
    isManager, 
    isEmployee, 
    login, 
    logout 
  }), [user, token, isAuthenticated, isAdmin, isManager, isEmployee, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}