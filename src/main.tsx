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
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const swPath = appBasePath === '/' ? '/sw.js' : `${appBasePath}/sw.js`
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swPath).catch((error) => {
        console.warn('Falha ao registrar Service Worker:', error)
      })
    })
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  )
}
