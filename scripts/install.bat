@echo off
REM Double-cliquable : lance l'installateur Windows de POS Algerie.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows-install.ps1" %*
pause
