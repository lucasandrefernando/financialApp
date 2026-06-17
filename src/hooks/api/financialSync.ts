import type { QueryClient } from '@tanstack/react-query'

export const financialQueryOptions = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: 'always' as const,
  refetchOnReconnect: true,
}

const FINANCIAL_QUERY_KEYS = [
  ['accounts'],
  ['dashboard'],
  ['transactions'],
  ['budgets'],
  ['goals'],
] as const

export function invalidateFinancialQueries(queryClient: QueryClient) {
  FINANCIAL_QUERY_KEYS.forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey })
  })
}

export async function syncFinancialQueries(queryClient: QueryClient) {
  invalidateFinancialQueries(queryClient)

  await Promise.all(
    FINANCIAL_QUERY_KEYS.map(queryKey =>
      queryClient.refetchQueries({ queryKey, type: 'active' })
    )
  )
}
