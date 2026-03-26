import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../../stores/appStore'
import { dashboardService } from '../../services/dashboard'

export function useDashboard() {
  const { selectedMonth } = useAppStore()
  return useQuery({
    queryKey: ['dashboard', selectedMonth],
    queryFn: () => dashboardService.get(selectedMonth.year, selectedMonth.month),
  })
}

export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: dashboardService.getInsights,
    staleTime: 5 * 60 * 1000,
  })
}
