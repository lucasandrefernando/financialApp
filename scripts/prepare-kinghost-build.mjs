import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const publicDir = path.join(rootDir, 'public')

if (!fs.existsSync(distDir)) {
  throw new Error('Pasta dist nao encontrada. Rode npm run build antes.')
}

fs.rmSync(publicDir, { recursive: true, force: true })
fs.cpSync(distDir, publicDir, { recursive: true })

console.log('Build preparado para KingHost:')
console.log('- Frontend copiado de dist/ para public/')
console.log('- Backend bundlado em FinancialApp.js')
