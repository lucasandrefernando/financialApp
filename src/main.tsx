import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/index.css'
import { ensureBasePathPrefix, resolveAppBasePath } from './lib/basePath'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 2 * 60 * 1000 } }
})

const appBasePath = resolveAppBasePath(import.meta.env.VITE_APP_BASE_PATH)
const redirected = ensureBasePathPrefix(appBasePath)

if (!redirected) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  )
}
