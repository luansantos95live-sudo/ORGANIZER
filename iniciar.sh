#!/usr/bin/env bash
# Fluxo Caixa: sobe o sistema local e abre o navegador (macOS e Linux).
set -e
cd "$(dirname "$0")/app"
command -v node >/dev/null || { echo "Instale o Node.js LTS em https://nodejs.org e rode de novo."; exit 1; }
[ -d node_modules ] || { echo "Primeira vez: instalando o sistema..."; npm install --no-audit --no-fund; }
echo "Fluxo Caixa rodando em http://localhost:5173 (Ctrl+C para parar)"
npm run iniciar
