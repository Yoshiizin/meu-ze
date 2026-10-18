@echo off
cd /d "%~dp0"
echo Iniciando Meu Ze - ambiente local...
if not exist ".env.local" (
  echo AVISO: copie .env.example para .env.local e configure o Supabase.
)
call npm.cmd install
if errorlevel 1 (
  echo Falha ao instalar dependencias. Verifique a internet e Node.js.
  pause
  exit /b 1
)
call npm.cmd run dev
pause
