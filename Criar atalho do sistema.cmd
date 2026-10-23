@echo off
rem Clique duas vezes para criar o atalho "Fluxo Caixa" na area de trabalho e no menu Iniciar deste PC.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ferramentas\criar-atalho.ps1"
pause
