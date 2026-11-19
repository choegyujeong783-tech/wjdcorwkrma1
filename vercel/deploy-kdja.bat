@echo off
chcp 65001 > nul
cd /d "%~dp0kdja"
echo [KDJA] Vercel deploy...
call vercel --prod
pause
