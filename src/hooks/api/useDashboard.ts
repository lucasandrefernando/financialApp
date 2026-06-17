import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../../stores/appStore'
import { dashboardService } from '../../services/dashboard'
import { financialQueryOptions } from './financialSync'

export function useDashboard() {
  const { selectedMonth } = useAppStore()
  return useQuery({
    queryKey: ['dashboard', selectedMonth],
    queryFn: () => dashboardService.get(selectedMonth.year, selectedMonth.month),
    ...financialQueryOptions,
  })
}

export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: dashboardService.getInsights,
    staleTime: 5 * 60 * 1000,
  })
}
