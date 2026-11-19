@echo off
rem Liga a criacao automatica das pastas das O.S. novas: a cada 5 minutos o Windows roda, escondido,
rem ferramentas\pastas-automaticas.vbs (le os e-mails da Caixa e cria a pasta de cada O.S. nova no OneDrive).
rem Para desligar: Desligar pastas automaticas.cmd
schtasks /Create /F /TN "Fluxo Caixa - Pastas das OS" /SC MINUTE /MO 5 /TR "wscript.exe \"%~dp0ferramentas\pastas-automaticas.vbs\""
if errorlevel 1 ( echo Nao consegui ligar. & pause & exit /b 1 )
schtasks /Run /TN "Fluxo Caixa - Pastas das OS" >nul
echo.
echo Pronto: as pastas das O.S. novas serao criadas sozinhas a cada 5 minutos.
timeout /t 6 >nul
