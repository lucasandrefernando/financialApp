import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/index.css'
import { ensureBasePathPrefix, resolveAppBasePath } from './lib/basePath'
import { invalidateFinancialQueries } from './hooks/api/financialSync'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnReconnect: true,
      refetchOnWindowFocus: 'always',
    },
  },
})

const appBasePath = resolveAppBasePath(import.meta.env.VITE_APP_BASE_PATH)
const redirected = ensureBasePathPrefix(appBasePath)

try {
  const storedTheme = JSON.parse(localStorage.getItem('app-storage') || '{}')?.state?.theme
  const theme = storedTheme === 'dark' ? 'dark' : 'light'
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
} catch {
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = 'light'
}

if (!redirected) {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      invalidateFinancialQueries(queryClient)
    }
  })

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  )
}
