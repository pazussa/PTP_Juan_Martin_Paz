@echo off
REM Instalacion en Windows: doble clic o "setup-windows.cmd" en cmd.exe.
setlocal
pushd "%~dp0" || exit /b 1
node scripts\setup.js
set "setupExitCode=%errorlevel%"
popd
if not "%setupExitCode%"=="0" (
  echo.
  echo Si el error es que 'node' no se reconoce, instala Node.js 22 LTS desde
  echo https://nodejs.org/ , abre una terminal nueva y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b %setupExitCode%
)
pause
endlocal
