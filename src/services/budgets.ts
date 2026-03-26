import api from '../lib/api'
export const budgetsService = {
  list: () => api.get('/api/budgets').then(r => r.data),
  create: (data: any) => api.post('/api/budgets', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/api/budgets/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/budgets/${id}`).then(r => r.data),
}
