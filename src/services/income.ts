import api from '../lib/api'
export const incomeService = {
  list: () => api.get('/api/income').then(r => r.data),
  create: (data: any) => api.post('/api/income', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/api/income/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/income/${id}`).then(r => r.data),
}
