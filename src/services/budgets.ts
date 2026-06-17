import api from '../lib/api'

function withNoCacheParams(params?: Record<string, unknown>) {
  return {
    ...(params || {}),
    _ts: Date.now(),
  }
}

export const budgetsService = {
  list: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return []
    try {
      return await api.get('/api/budgets', { params: withNoCacheParams() }).then(r => r.data)
    } catch (error: any) {
      if (error?.response?.status === 401) return []
      throw error
    }
  },
  create: (data: any) => api.post('/api/budgets', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/api/budgets/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/budgets/${id}`).then(r => r.data),
}
