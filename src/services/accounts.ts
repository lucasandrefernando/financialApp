import api from '../lib/api'

function withNoCacheParams(params?: Record<string, unknown>) {
  return {
    ...(params || {}),
    _ts: Date.now(),
  }
}

export const accountsService = {
  list: () => api.get('/api/accounts', { params: withNoCacheParams() }).then(r => r.data),
  create: (data: any) => api.post('/api/accounts', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/api/accounts/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/accounts/${id}`).then(r => r.data),
}
