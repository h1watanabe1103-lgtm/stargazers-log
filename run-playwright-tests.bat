@echo off
setlocal
cd /d "%~dp0"
title my-app2 Playwright E2E Test Runner

echo ======================================================
echo my-app2 : Playwright screen-operation test runner
echo ======================================================
echo.
echo [1/3] Installing project packages and updating lockfile...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed

echo.
echo [2/3] Checking / installing Chromium for Playwright...
call npx playwright install chromium
if errorlevel 1 goto failed

echo.
echo [3/3] Running browser screen-operation test...
call npm run test:e2e
if errorlevel 1 goto failed

echo.
echo SUCCESS: Playwright screen-operation test passed.
echo If you need details, check the playwright-report folder or test-results folder.
pause
exit /b 0

:failed
echo.
echo FAILED: Please take a screenshot of this window and send it for troubleshooting.
pause
exit /b 1
