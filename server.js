import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const PUBLIC_DIR = path.join(__dirname, 'public')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.webp': 'image/webp',
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0]

  // Segurança: bloqueia path traversal
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(PUBLIC_DIR, safePath)

  const tryFile = (fp) => {
    try {
      const stat = fs.statSync(fp)
      if (stat.isDirectory()) return tryFile(path.join(fp, 'index.html'))
      const ext = path.extname(fp).toLowerCase()
      const mime = MIME[ext] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': mime })
      fs.createReadStream(fp).pipe(res)
      return true
    } catch {
      return false
    }
  }

  // Tenta servir o arquivo; se não existir, cai no index.html (SPA routing)
  if (!tryFile(filePath)) {
    const index = path.join(PUBLIC_DIR, 'index.html')
    if (fs.existsSync(index)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      fs.createReadStream(index).pipe(res)
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  }
})

server.listen(PORT, () => {
  console.log(`Financial App rodando na porta ${PORT}`)
})
