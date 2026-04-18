import API from './api';

export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const loginWithGoogle = (credential) => API.post('/auth/google/login', { credential });
export const getProfile = () => API.get('/auth/profile');
export const changePassword = (data) => API.put('/auth/change-password', data);
export const forgotPassword = (data) => API.post('/auth/forgot-password', data);
export const uploadAvatar = (formData) => API.post('/auth/upload-avatar', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
