import API from './api';

export const getGoals = (config = {}) =>
  API.get('/goals', config);

export const getGoalProgress = (config = {}) =>
  API.get('/goals/progress', config);

export const checkWarning = (config = {}) =>
  API.post('/goals/check-warning', {}, config);

export const createGoal = (data, config = {}) =>
  API.post('/goals', data, config);

export const updateGoal = (id, data, config = {}) =>
  API.put(`/goals/${id}`, data, config);

export const deleteGoal = (id, config = {}) =>
  API.delete(`/goals/${id}`, config);