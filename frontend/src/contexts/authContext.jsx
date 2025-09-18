// contexts/authContext.jsx
import {createContext, useContext, useEffect, useMemo, useState, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {authService} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const navigate = useNavigate();

    const [user, setUser] = useState(() => authService.getCurrentUser());
    const [token, setToken] = useState(() => authService.getToken());
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!authService.getCurrentUser());

    const isAdmin = useMemo(() => (user?.role || '').toLowerCase() === 'admin', [user]);
    const isManager = useMemo(() => (user?.role || '').toLowerCase() === 'manager', [user]);
    const isEmployee = useMemo(() => (user?.role || '').toLowerCase() === 'employee', [user]);

    const syncFromStorage = useCallback(() => {
        const u = authService.getCurrentUser();
        const t = authService.getToken();
        setUser(u);
        setToken(t);
        setIsAuthenticated(!!u);
    }, []);

    /** Đăng xuất + điều hướng chắc chắn về /login */
    const logout = useCallback(() => {
        try {
            // First clear the auth data
            authService.logout();

            // Update all states in one batch to avoid race conditions
            Promise.resolve().then(() => {
                setUser(null);
                setToken(null);
                setIsAuthenticated(false);

                // Navigate immediately after state updates
                navigate('/login', {replace: true});
            }).catch(() => {
                // Fallback to window.location if navigation fails
                window.location.replace('/login');
            });
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect if something goes wrong
            window.location.replace('/login');
        }
    }, [navigate]);

    /**
     * Đăng nhập: gọi API, đồng bộ state; điều hướng do trang Login quyết định.
     */
    const login = useCallback(
        async (credentials) => {
            const data = await authService.login(credentials);
            syncFromStorage();
            return {data, user: authService.getCurrentUser()};
        },
        [syncFromStorage]
    );

    // Đồng bộ giữa các tab + auto logout khi token hết hạn
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'user' || e.key === 'token') syncFromStorage();
        };
        window.addEventListener('storage', onStorage);

        const interval = setInterval(() => {
            const current = authService.getToken();
            if (current && !authService.isValidToken(current)) logout();
        }, 5 * 60 * 1000);

        return () => {
            window.removeEventListener('storage', onStorage);
            clearInterval(interval);
        };
    }, [logout, syncFromStorage]);

    const value = useMemo(() => ({
        user,
        token,
        isAuthenticated,
        isAdmin,
        isManager,
        isEmployee,
        login,
        logout,
    }), [user, token, isAuthenticated, isAdmin, isManager, isEmployee, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
