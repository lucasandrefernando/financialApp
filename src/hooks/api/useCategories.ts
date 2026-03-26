import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesService } from '../../services/categories'

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: categoriesService.list })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: categoriesService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => categoriesService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: categoriesService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
