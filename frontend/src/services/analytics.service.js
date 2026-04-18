import API from './api';

export const getSummary = (period) => API.get('/analytics/summary', { params: { period } });
export const getBySubject = () => API.get('/analytics/by-subject');
export const getHeatmap = () => API.get('/analytics/heatmap');
export const getFocusScore = () => API.get('/analytics/focus-score');
export const getGoalProgress = () => API.get('/analytics/goal-progress');
