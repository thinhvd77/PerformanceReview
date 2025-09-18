// services/authService.js
import api from './api';

function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

export const authService = {
    register: async (userData) => {
        const { data } = await api.post('/users/register', userData);
        return data;
    },

    changePassword: async ({ currentPassword, newPassword }) => {
        const { data } = await api.post('/users/change-password', { currentPassword, newPassword });
        return data;
    },

    // Gọi API đăng nhập, lưu token/user vào localStorage (không điều hướng)
    login: async (credentials) => {
        const { data } = await api.post('/users/login', credentials);
        if (data?.token) {
            const token = data.token;
            localStorage.setItem('token', token);
            const payload = decodeJwt(token) || {};
            const role = payload.role;
            const user = { ...(data.user || {}), role };
            localStorage.setItem('user', JSON.stringify(user));
        }
        return data;
    },

    // Chỉ xóa dữ liệu auth — KHÔNG đụng tới history/location
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
    },

    getCurrentUser: () => {
        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            if (!token || !userStr || !authService.isValidToken(token)) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                return null;
            }
            return JSON.parse(userStr);
        } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
        }
    },

    getToken: () => localStorage.getItem('token'),

    isValidToken: (token) => {
        if (!token) return false;
        try {
            const payload = decodeJwt(token);
            if (!payload) return false;
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) return false;
            return true;
        } catch {
            return false;
        }
    },

    isTokenExpired: (token) => {
        if (!token) return true;
        try {
            const payload = decodeJwt(token);
            if (!payload?.exp) return true;
            const now = Math.floor(Date.now() / 1000);
            return payload.exp < now;
        } catch {
            return true;
        }
    },

    getProfile: async () => {
        const { data } = await api.get('/users/profile');
        return data;
    },
};
