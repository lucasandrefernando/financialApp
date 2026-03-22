@echo off
REM ============================================
REM PM2 Setup Script - Financial App (Windows)
REM ============================================
REM Este script configura o PM2 para gerenciar
REM o Frontend e Backend do Financial App
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         PM2 Setup - Financial App (Windows)                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM ============================================
REM 1. Verificar se PM2 está instalado
REM ============================================
echo [1/5] Verificando PM2...

pm2 --version >nul 2>&1
if errorlevel 1 (
    echo PM2 não encontrado. Instalando globalmente...
    call npm install -g pm2
    if errorlevel 1 (
        echo ✗ Erro ao instalar PM2
        pause
        exit /b 1
    )
    echo ✓ PM2 instalado com sucesso
) else (
    echo ✓ PM2 já está instalado
    call pm2 --version
)

echo.

REM ============================================
REM 2. Criar diretório de logs
REM ============================================
echo [2/5] Criando diretório de logs...

if not exist "logs" (
    mkdir logs
    echo ✓ Diretório ./logs criado
) else (
    echo ✓ Diretório ./logs já existe
)

echo.

REM ============================================
REM 3. Instalar dependências
REM ============================================
echo [3/5] Instalando dependências...

echo   → Frontend...
call npm install
if errorlevel 1 (
    echo   ✗ Erro no Frontend
    pause
    exit /b 1
)
echo   ✓ Frontend OK

echo   → Backend...
cd backend
call npm install
if errorlevel 1 (
    echo   ✗ Erro no Backend
    cd ..
    pause
    exit /b 1
)
echo   ✓ Backend OK
cd ..

echo.

REM ============================================
REM 4. Parar processos antigos
REM ============================================
echo [4/5] Parando processos antigos...

call pm2 delete ecosystem.windows.config.js 2>nul
echo ✓ Processos antigos removidos

echo.

REM ============================================
REM 5. Iniciar com PM2
REM ============================================
echo [5/5] Iniciando com PM2...

call pm2 start ecosystem.windows.config.js
if errorlevel 1 (
    echo ✗ Erro ao iniciar processos
    pause
    exit /b 1
)
echo ✓ Processos iniciados com sucesso

echo.

REM ============================================
REM Salvar configuração
REM ============================================
echo Salvando configuração do PM2...
call pm2 save

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    ✓ SETUP COMPLETO!                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo ✓ Seu projeto está rodando com PM2!
echo.
echo 📊 Status dos processos:
call pm2 status
echo.
echo 🌐 Acessar:
echo    Frontend:  http://localhost:5173
echo    Backend:   http://localhost:3000
echo.
echo 📚 Comandos úteis:
echo    pm2 status              → Ver status dos processos
echo    pm2 logs                → Ver logs em tempo real
echo    pm2 logs financial-app-frontend  → Logs do frontend
echo    pm2 logs financial-app-backend   → Logs do backend
echo    pm2 restart all         → Reiniciar todos
echo    pm2 stop all            → Parar todos
echo    pm2 delete all          → Deletar todos
echo    pm2 monit               → Monitor em tempo real
echo.

pause
