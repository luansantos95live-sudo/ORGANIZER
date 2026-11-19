@echo off
rem Abre o Fluxo Caixa no Chrome em modo aplicativo (janela propria, sem abas), igual ao FLUXO ARQ.
rem Funciona em qualquer PC: usa a pasta deste arquivo. Se o sistema ainda nao foi gerado, gera antes.
cd /d "%~dp0"
if not exist "dist\Fluxo_Caixa.html" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo O sistema ainda nao foi gerado e o Node.js nao esta instalado.
    echo Instale a versao LTS em https://nodejs.org/pt e abra este arquivo de novo.
    pause
    exit /b 1
  )
  echo Gerando o sistema pela primeira vez. Isso leva um ou dois minutos...
  pushd app
  if not exist node_modules call npm install
  call npm run build:single
  popd
)
rem Com as O.S. reais (Dados\Fluxo_Caixa.html, gerado junto quando existe Dados\os-reais.json) abre essa versao.
if exist "Dados\Fluxo_Caixa.html" (
  start "" chrome --app="%~dp0Dados\Fluxo_Caixa.html"
) else (
  start "" chrome --app="%~dp0dist\Fluxo_Caixa.html"
)
