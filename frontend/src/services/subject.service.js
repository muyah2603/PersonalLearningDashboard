import API from './api';

export const getSubjects = () => API.get('/subjects');
export const createSubject = (data) => API.post('/subjects', data);
