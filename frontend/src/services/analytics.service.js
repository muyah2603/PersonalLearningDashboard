import API from './api';

export const getSummary = (period, config = {}) =>
  API.get('/analytics/summary', {
    params: { period },
    ...config,
  });

export const getBySubject = (config = {}) =>
  API.get('/analytics/by-subject', config);

export const getHeatmap = (config = {}) =>
  API.get('/analytics/heatmap', config);

export const getFocusScore = (config = {}) =>
  API.get('/analytics/focus-score', config);

export const getGoalProgress = (config = {}) =>
  API.get('/analytics/goal-progress', config);