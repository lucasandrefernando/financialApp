module.exports = {
  apps: [
    {
      name: 'financial-app-kinghost',
      script: 'FinancialApp.js',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 21149,
        HOST: '0.0.0.0',
        APP_BASE_PATH: '/financialApp',
      },
      watch: false,
      ignore_watch: ['node_modules', 'dist', '.git', 'logs'],
      error_file: './logs/kinghost-error.log',
      out_file: './logs/kinghost-out.log',
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      instances: 1,
      exec_mode: 'fork',
      kill_timeout: 5000,
    },
  ],
}
