@echo off
setlocal
pushd "%~dp0" || exit /b 1
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo Install Node.js 24.13 or later with npm, then run this launcher again.
    popd
    pause
    exit /b 1
)

set "CABIN_OPEN_BROWSER=1"
call npm.cmd run play
set "result=%errorlevel%"
popd
if not "%result%"=="0" pause
exit /b %result%
