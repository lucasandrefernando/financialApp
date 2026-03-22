# ⚡ PM2 - Início Rápido

## 🎯 Em 2 Minutos

### Passo 1: Instalar PM2
```bash
npm install -g pm2
```

### Passo 2: Executar Setup
**Windows:**
```bash
setup-pm2.bat
```

**Linux/Mac:**
```bash
chmod +x setup-pm2.sh
./setup-pm2.sh
```

### Passo 3: Pronto! ✨
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs

# Acessar
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

---

## 📊 Comandos Essenciais

```bash
# Status
pm2 status                    # Ver todos os processos
pm2 logs                      # Ver logs em tempo real
pm2 monit                     # Monitor (CPU, memória)

# Controle
pm2 restart all               # Reiniciar todos
pm2 stop all                  # Parar todos
pm2 delete all                # Deletar todos

# Específico
pm2 restart financial-app-frontend
pm2 logs financial-app-backend
pm2 stop financial-app-frontend

# Boot
pm2 save                      # Salvar configuração
pm2 startup                   # Iniciar na boot
```

---

## 🌐 Acessar

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |

---

## 📁 Estrutura

```
financial-app/
├── ecosystem.config.js          ← Configuração PM2
├── ecosystem.windows.config.js  ← Windows
├── setup-pm2.sh                 ← Setup Linux/Mac
├── setup-pm2.bat                ← Setup Windows
├── logs/                        ← Logs dos processos
│   ├── frontend-out.log
│   ├── frontend-error.log
│   ├── backend-out.log
│   └── backend-error.log
├── src/                         ← Frontend
└── backend/                     ← Backend
```

---

## ✅ Verificação

```bash
# Tudo funcionando?
pm2 status

# Deve mostrar:
# ┌─────────────────────────────────────────────────────┐
# │ id │ name                      │ status  │ ↺ │ cpu │
# ├────┼───────────────────────────┼─────────┼───┼─────┤
# │ 0  │ financial-app-frontend    │ online  │ 0 │ 0%  │
# │ 1  │ financial-app-backend     │ online  │ 0 │ 0%  │
# └─────────────────────────────────────────────────��───┘
```

---

## 🚀 Próximos Passos

1. Leia: `GUIA_PM2.md` (guia completo)
2. Explore: `pm2 help`
3. Monitore: `pm2 monit`

---

**Tudo pronto! 🎉**
