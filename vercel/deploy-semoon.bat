@echo off
chcp 65001 > nul
cd /d "%~dp0semoon"
echo [semoon.store] Vercel deploy...
call vercel --prod
pause
