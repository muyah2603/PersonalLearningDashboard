import API from './api';

export const getGoals = () => API.get('/goals');
export const getGoalProgress = () => API.get('/goals/progress');
export const checkWarning = () => API.get('/goals/check-warning');
export const createGoal = (data) => API.post('/goals', data);
export const updateGoal = (id, data) => API.put(`/goals/${id}`, data);
export const deleteGoal = (id) => API.delete(`/goals/${id}`);
