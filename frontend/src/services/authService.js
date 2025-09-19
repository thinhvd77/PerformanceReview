// services/authService.js
import api from './api';

export const authService = {
    register: async (userData) => {
        const { data } = await api.post('/users/register', userData);
        return data;
    },

    changePassword: async ({ currentPassword, newPassword }) => {
        const { data } = await api.post('/users/change-password', { currentPassword, newPassword });
        return data;
    }
};
