import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

// routes
import authRoutes from './backend/routes/auth.js'
import accountRoutes from './backend/routes/accounts.js'
import incomeRoutes from './backend/routes/income.js'
import categoryRoutes from './backend/routes/categories.js'
import transactionRoutes from './backend/routes/transactions.js'
import budgetRoutes from './backend/routes/budgets.js'
import goalRoutes from './backend/routes/goals.js'
import dashboardRoutes from './backend/routes/dashboard.js'
import sharingRoutes from './backend/routes/sharing.js'
import insightRoutes from './backend/routes/insights.js'
import onboardingRoutes from './backend/routes/onboarding.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

const kinghostPortEntry = Object.entries(process.env).find(
  ([key, value]) => key.startsWith('PORT_') && /^\d+$/.test(String(value || ''))
)
const PORT = Number(process.env.PORT || kinghostPortEntry?.[1] || 21149)
const HOST = process.env.HOST || '0.0.0.0'
const BASE_PATH = normalizeBasePath(
  process.env.APP_BASE_PATH ||
  process.env.BASE_PATH ||
  process.env.VITE_APP_BASE_PATH ||
  '/'
)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

function normalizeBasePath(value) {
  if (!value || value === '/') return '/'
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '')
}

function mountApiRoutes(prefix = '') {
  const routePrefix = prefix === '/' ? '' : prefix

  app.use(`${routePrefix}/api/auth`, authRoutes)
  app.use(`${routePrefix}/api/accounts`, accountRoutes)
  app.use(`${routePrefix}/api/income`, incomeRoutes)
  app.use(`${routePrefix}/api/categories`, categoryRoutes)
  app.use(`${routePrefix}/api/transactions`, transactionRoutes)
  app.use(`${routePrefix}/api/budgets`, budgetRoutes)
  app.use(`${routePrefix}/api/goals`, goalRoutes)
  app.use(`${routePrefix}/api/dashboard`, dashboardRoutes)
  app.use(`${routePrefix}/api/sharing`, sharingRoutes)
  app.use(`${routePrefix}/api/insights`, insightRoutes)
  app.use(`${routePrefix}/api/onboarding`, onboardingRoutes)
}

mountApiRoutes('/')
if (BASE_PATH !== '/') {
  mountApiRoutes(BASE_PATH)
}

const STATIC_DIR = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, 'dist')

app.use(express.static(STATIC_DIR))
if (BASE_PATH !== '/') {
  app.use(BASE_PATH, express.static(STATIC_DIR))
}

app.get('*', (req, res) => {
  const rootApiPath = req.path === '/api' || req.path.startsWith('/api/')
  const baseApiPath =
    BASE_PATH !== '/' &&
    (req.path === `${BASE_PATH}/api` || req.path.startsWith(`${BASE_PATH}/api/`))

  if (rootApiPath || baseApiPath) {
    return res.status(404).json({ error: 'Rota API nao encontrada' })
  }

  const index = path.join(STATIC_DIR, 'index.html')
  if (fs.existsSync(index)) {
    return res.sendFile(index)
  }

  return res.status(503).send('Build not found. Run npm run build.')
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

const server = app.listen(PORT, HOST, () => {
  console.log(`Financial App rodando em ${HOST}:${PORT}`)
  console.log(`Base path configurada: ${BASE_PATH}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} em uso. Aguarde e tente novamente.`)
    process.exit(1)
  }
})
