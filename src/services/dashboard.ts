import api from '../lib/api'
export const dashboardService = {
  get: (year: number, month: number) => api.get('/api/dashboard', { params: { year, month } }).then(r => r.data),
  getInsights: () => api.get('/api/insights').then(r => r.data),
}
