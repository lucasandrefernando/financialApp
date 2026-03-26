import api from '../lib/api'
export const goalsService = {
  list: () => api.get('/api/goals').then(r => r.data),
  create: (data: any) => api.post('/api/goals', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/api/goals/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/goals/${id}`).then(r => r.data),
}
