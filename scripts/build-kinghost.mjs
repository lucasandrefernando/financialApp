import { spawnSync } from 'node:child_process'

process.env.VITE_APP_BASE_PATH = process.env.VITE_APP_BASE_PATH || '/financialApp'
process.env.APP_BASE_PATH = process.env.APP_BASE_PATH || process.env.VITE_APP_BASE_PATH

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const build = spawnSync(npmCommand, ['run', 'build'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

if (build.error) {
  console.error(build.error)
}

if (build.status !== 0) {
  process.exit(build.status ?? 1)
}

const prepare = spawnSync('node', ['scripts/prepare-kinghost-build.mjs'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

if (prepare.error) {
  console.error(prepare.error)
}

process.exit(prepare.status ?? 0)
