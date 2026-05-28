import API from './api';

export const getSessions    = (config = {})        => API.get('/sessions', config);
export const getSessionById = (id, config = {})    => API.get(`/sessions/${id}`, config);
export const createSession  = (data, config = {})  => API.post('/sessions', data, config);
export const updateSession  = (id, data, config = {}) => API.put(`/sessions/${id}`, data, config);
export const deleteSession  = (id, config = {})    => API.delete(`/sessions/${id}`, config);