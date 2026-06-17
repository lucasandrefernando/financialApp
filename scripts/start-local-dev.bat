@echo off
setlocal

cd /d "%~dp0\.."

echo.
echo ========================================
echo   Financial App - Local Dev
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado no PATH.
  echo Instale o Node.js ou abra um terminal com Node configurado.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias do projeto...
  call npm.cmd install
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

if not exist "logs" mkdir logs

set "MARIADB_BIN=C:\Program Files\MariaDB 12.3\bin"
set "MARIADB_DATA=%cd%\.local-mariadb\data"

if exist "%MARIADB_BIN%\mariadbd.exe" (
  if exist "%MARIADB_DATA%\my.ini" (
    netstat -ano | findstr ":3306 " >nul 2>nul
    if errorlevel 1 (
      echo Iniciando MariaDB local em 127.0.0.1:3306
      start "FinancialApp MariaDB" cmd /k """%MARIADB_BIN%\mariadbd.exe"" --defaults-file=""%MARIADB_DATA%\my.ini"" --datadir=""%MARIADB_DATA%"" --console"
      timeout /t 3 /nobreak >nul
    ) else (
      echo MariaDB ja esta usando a porta 3306.
    )
  ) else (
    echo MariaDB instalado, mas data directory local nao encontrado.
    echo Inicialize com:
    echo "%MARIADB_BIN%\mariadb-install-db.exe" --datadir="%MARIADB_DATA%" --password="" --port=3306
  )
)

echo Iniciando API local em http://localhost:21149
start "FinancialApp API" cmd /k "cd /d ""%cd%"" && set ""HOST=127.0.0.1"" && set ""PORT=21149"" && set ""APP_BASE_PATH=/"" && set ""VITE_APP_BASE_PATH=/"" && node FinancialApp.js"

echo.
echo Aguardando API iniciar...
timeout /t 3 /nobreak >nul

echo.
echo Iniciando frontend local em http://localhost:5173
echo.
echo Use esta URL no navegador:
echo http://localhost:5173/login
echo.
echo Observacao: login e dados precisam de MySQL local configurado.
echo Padrao esperado: host 127.0.0.1, porta 3306, usuario root, banco financial_app.
echo.

call npm.cmd run dev

endlocal
