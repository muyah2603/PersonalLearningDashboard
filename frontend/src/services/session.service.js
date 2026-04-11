import API from './api';

export const getSessions = (params) => API.get('/sessions', { params });
export const getSessionById = (id) => API.get(`/sessions/${id}`);
export const createSession = (data) => API.post('/sessions', data);
export const updateSession = (id, data) => API.put(`/sessions/${id}`, data);
export const deleteSession = (id) => API.delete(`/sessions/${id}`);
