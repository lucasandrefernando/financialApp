import api from '../lib/api'
export const categoriesService = {
  list: () => api.get('/api/categories').then(r => r.data),
  create: (data: any) => api.post('/api/categories', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/api/categories/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/categories/${id}`).then(r => r.data),
}
