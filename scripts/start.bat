@echo off
REM Script para iniciar o projeto Financial App com ambas as partes

echo.
echo ========================================
echo   Financial App - Setup Completo
echo ========================================
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não está instalado!
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detectado
echo.

REM Menu de opções
echo Escolha como deseja rodar o projeto:
echo.
echo 1) Rodar APENAS o Frontend (API Groq Direta)
echo 2) Rodar Frontend + Backend (Proxy)
echo 3) Rodar APENAS o Backend
echo.

set /p choice="Digite sua escolha (1, 2 ou 3): "

if "%choice%"=="1" (
    echo.
    echo 🚀 Iniciando Frontend com API Groq Direta...
    echo.
    npm run dev
) else if "%choice%"=="2" (
    echo.
    echo 🚀 Iniciando Frontend + Backend...
    echo.
    echo Abrindo 2 terminais...
    echo.
    
    REM Abrir backend em novo terminal
    start cmd /k "cd backend && npm install && npm run dev"
    
    REM Aguardar um pouco para o backend iniciar
    timeout /t 3 /nobreak
    
    REM Iniciar frontend no terminal atual
    npm run dev
) else if "%choice%"=="3" (
    echo.
    echo 🚀 Iniciando Backend...
    echo.
    cd backend
    npm install
    npm run dev
) else (
    echo ❌ Opção inválida!
    pause
    exit /b 1
)
