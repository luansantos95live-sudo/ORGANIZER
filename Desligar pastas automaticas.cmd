@echo off
schtasks /Delete /F /TN "Fluxo Caixa - Pastas das OS"
timeout /t 4 >nul
