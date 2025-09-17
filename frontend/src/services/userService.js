import api from './api';

export const userService = {
  list: async (params = {}) => {
    const res = await api.get('/users', { params });
    return res.data; // { data, total, page, pageSize }
    },
  get: async (id) => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },
  create: async (payload) => {
    const res = await api.post('/users', payload);
    return res.data; // { message, user }
  },
  update: async (id, payload) => {
    const res = await api.put(`/users/${id}`, payload);
    return res.data; // { message, user }
  },
  remove: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data; // { message }
  },
};
