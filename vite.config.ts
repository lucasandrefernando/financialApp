import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const normalizeBasePath = (value) => {
  if (!value || value === '/') return '/'
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  const withTrailingSlash = withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`
  return withTrailingSlash
}

const BASE_PATH = normalizeBasePath(
  process.env.VITE_APP_BASE_PATH || '/financialApp/'
)

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
