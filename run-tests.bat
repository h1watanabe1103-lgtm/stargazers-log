@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo my-app2 : automatic test runner
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or PATH is not set.
  echo Install a current Node.js LTS version, then run this file again.
  goto :failed
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js including npm.
  goto :failed
)

echo [1/2] Installing required packages...
call npm install
if errorlevel 1 goto :failed

echo.
echo [2/2] Running all tests...
call npm test
if errorlevel 1 goto :failed

echo.
echo ============================================
echo SUCCESS: all configured tests passed.
echo ============================================
echo.
pause
exit /b 0

:failed
echo.
echo ============================================
echo The process failed. Copy this whole window and send it to ChatGPT.
echo ============================================
echo.
pause
exit /b 1
