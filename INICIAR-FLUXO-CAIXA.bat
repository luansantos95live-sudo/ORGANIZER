@echo off
title Fluxo Caixa - sistema local
cd /d "%~dp0app"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js nao foi encontrado neste computador.
  echo Instale a versao LTS em https://nodejs.org e abra este arquivo de novo.
  start "" https://nodejs.org/pt
  pause
  exit /b 1
)

if not exist node_modules (
  echo Primeira vez: instalando o sistema. Leva de 1 a 3 minutos...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Nao foi possivel instalar. Verifique a internet e tente de novo.
    pause
    exit /b 1
  )
)

echo.
echo Fluxo Caixa rodando em http://localhost:5173
echo Deixe esta janela aberta enquanto usa o sistema. Para parar, feche a janela.
echo.
call npm run iniciar
pause
