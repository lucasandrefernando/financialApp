import { spawn } from 'node:child_process'

const DEFAULT_API_URL = 'https://anacron.com.br/financialApp'

const env = {
  ...process.env,
  VITE_API_URL: process.env.VITE_API_URL || DEFAULT_API_URL,
  VITE_APP_BASE_PATH: process.env.VITE_APP_BASE_PATH || '/',
}

console.log('[android] Building web bundle with:')
console.log(`- VITE_API_URL=${env.VITE_API_URL}`)
console.log(`- VITE_APP_BASE_PATH=${env.VITE_APP_BASE_PATH}`)

const npmCommand = process.platform === 'win32' ? 'npm run build' : 'npm run build'
const child = spawn(npmCommand, {
  stdio: 'inherit',
  env,
  shell: true,
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
