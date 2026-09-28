@echo off
chcp 65001 > nul
cd /d "%~dp0kbss"
echo [KBSS] Vercel deploy...
call vercel --prod
pause
