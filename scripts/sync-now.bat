@echo off
REM Double-cliquable : declenche immediatement une synchro locale -> Atlas
REM (necessite d'avoir lance install.bat en mode "Local + synchro Atlas" au prealable).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-to-atlas.ps1" %*
pause
