import api from './api';

function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (_) {
        return null;
    }
}

export const authService = {
    register: async (userData) => {
        const response = await api.post('/users/register', userData);
        return response.data;
    },

    changePassword: async ({currentPassword, newPassword}) => {
        const response = await api.post('/users/change-password', {currentPassword, newPassword});
        return response.data;
    },

    login: async (credentials) => {
        const response = await api.post('/users/login', credentials);
        if (response.data.token) {
            const token = response.data.token;
            localStorage.setItem('token', token);
            const payload = decodeJwt(token) || {};
            const role = payload.role;
            const user = {...(response.data.user || {}), role};
            localStorage.setItem('user', JSON.stringify(user));
        }
        return response.data;
    },

    logout: () => {
        // Clear all authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        
        // Clear browser history to prevent access to previous pages
        if (window.history && window.history.pushState) {
            // Replace current history entry with login page
            window.history.replaceState(null, '', '/login');
            // Clear forward history
            window.history.pushState(null, '', '/login');
            window.history.back();
        }
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        // Check if user data exists and token is valid
        if (!userStr || !token || !authService.isValidToken(token)) {
            // Clear invalid data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
        }
        
        return JSON.parse(userStr);
    },

    getToken: () => {
        return localStorage.getItem('token');
    },

    isValidToken: (token) => {
        if (!token) return false;
        
        try {
            const payload = decodeJwt(token);
            if (!payload) return false;
            
            // Check if token has expired
            const currentTime = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < currentTime) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    },

    isTokenExpired: (token) => {
        if (!token) return true;
        
        try {
            const payload = decodeJwt(token);
            if (!payload || !payload.exp) return true;
            
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < currentTime;
        } catch (error) {
            return true;
        }
    },

    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        return !!(token && user && authService.isValidToken(token));
    },

    getProfile: async () => {
        const response = await api.get('/users/profile');
        return response.data;
    },
};