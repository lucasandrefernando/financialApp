import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const DIST_DIR = path.join(__dirname, 'dist')
const BASE_PATH = normalizeBasePath(
  process.env.APP_BASE_PATH ||
  process.env.BASE_PATH ||
  process.env.VITE_APP_BASE_PATH ||
  '/financialApp'
)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
}

function normalizeBasePath(basePath) {
  if (!basePath) return '/'
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '')
  return withoutTrailingSlash || '/'
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not found')
}

function sendBuildMissing(res) {
  res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Build ausente. Execute "npm run build" para gerar a pasta dist.')
}

function fileExists(filePath) {
  try {
    const stat = fs.statSync(filePath)
    return stat.isFile()
  } catch {
    return false
  }
}

function streamFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': mime })
  fs.createReadStream(filePath).pipe(res)
}

function ensureBuildExists() {
  const spaIndex = path.join(DIST_DIR, 'index.html')
  if (fileExists(spaIndex)) return true

  console.log('Pasta dist ausente. Executando build automaticamente...')
  try {
    execSync('npm run build', { cwd: __dirname, stdio: 'inherit' })
    return fileExists(spaIndex)
  } catch {
    return false
  }
}

const buildReady = ensureBuildExists()

const server = http.createServer((req, res) => {
  if (!buildReady) {
    sendBuildMissing(res)
    return
  }
  const spaIndex = path.join(DIST_DIR, 'index.html')

  if (!req.url) {
    sendNotFound(res)
    return
  }

  const requestPath = decodeURIComponent(req.url.split('?')[0] || '/')
  const hasBasePrefix =
    BASE_PATH === '/' ||
    requestPath === BASE_PATH ||
    requestPath.startsWith(`${BASE_PATH}/`)

  let localPath = requestPath
  if (hasBasePrefix && BASE_PATH !== '/') {
    localPath = requestPath.slice(BASE_PATH.length) || '/'
  }

  const cleanLocalPath = localPath.replace(/^\/+/, '')
  const safePath = path.normalize(cleanLocalPath).replace(/^(\.\.[/\\])+/, '')
  const requestedFile = path.join(DIST_DIR, safePath)

  if (safePath && fileExists(requestedFile)) {
    streamFile(requestedFile, res)
    return
  }

  if ((hasBasePrefix || requestPath === '/') && fileExists(spaIndex)) {
    streamFile(spaIndex, res)
    return
  }

  sendNotFound(res)
})

server.listen(PORT, () => {
  console.log(`Financial App rodando na porta ${PORT}`)
  console.log(`Base path configurada: ${BASE_PATH}`)
})
