import api from '../lib/api'

function withNoCacheParams(params?: Record<string, unknown>) {
  return {
    ...(params || {}),
    _ts: Date.now(),
  }
}

export const dashboardService = {
  get: (year: number, month: number) => api.get('/api/dashboard', { params: withNoCacheParams({ year, month }) }).then(r => r.data),
  getInsights: () => api.get('/api/insights', { params: withNoCacheParams() }).then(r => r.data),
}
