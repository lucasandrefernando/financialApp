/**
 * PM2 Ecosystem Configuration - Windows Optimized
 * 
 * Versão otimizada para Windows com melhor suporte
 * 
 * Uso:
 * pm2 start ecosystem.windows.config.js
 */

export default {
  apps: [
    {
      name: 'financial-app-frontend',
      script: 'cmd.exe',
      args: ['/c', 'run-frontend.bat'],
      cwd: './',
      
      env: {
        PORT: 5173,
        NODE_ENV: 'development',
      },
      
      watch: false,
      ignore_watch: ['node_modules', 'dist', '.git'],
      
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      
      instances: 1,
      exec_mode: 'fork',
      
      kill_timeout: 5000,
    },
    
    {
      name: 'financial-app-backend',
      script: './backend/src/index.js',
      cwd: './',
      
      env: {
        PORT: 3000,
        NODE_ENV: 'development',
      },
      
      watch: ['./backend/src'],
      ignore_watch: ['./backend/node_modules'],
      
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      max_memory_restart: '300M',
      max_restarts: 10,
      min_uptime: '10s',
      
      instances: 1,
      exec_mode: 'fork',
      
      kill_timeout: 5000,
    },
  ],
}
