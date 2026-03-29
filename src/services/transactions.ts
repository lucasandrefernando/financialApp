import api from '../lib/api'

function withNoCacheParams(params?: Record<string, unknown>) {
  return {
    ...(params || {}),
    _ts: Date.now(),
  }
}

export const transactionsService = {
  list: (params?: any) => api.get('/api/transactions', { params: withNoCacheParams(params) }).then(r => r.data),
  summary: (year: number, month: number) => api.get('/api/transactions/summary', { params: withNoCacheParams({ year, month }) }).then(r => r.data),
  create: (data: any) => api.post('/api/transactions', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/api/transactions/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/transactions/${id}`).then(r => r.data),
}
