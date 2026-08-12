@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem Identity: backend\start-app*.bat (master) vs backend\app\start*.bat (deploy copy)
set "IS_APP_COPY=0"
if /i "%~nx0"=="start.bat" set "IS_APP_COPY=1"
if /i "%~nx0"=="start-with-postgen.bat" set "IS_APP_COPY=1"
if /i "%~nx0"=="start-without-postgen.bat" set "IS_APP_COPY=1"

if "%IS_APP_COPY%"=="0" (
    set "APP_DIR=%~dp0app"
) else (
    set "APP_DIR=%~dp0"
)
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

rem Default: start postgen (text cover service) together with backend.
rem Use start-app-without-postgen.bat to skip it.
set "WITH_POSTGEN=1"

if not exist "%APP_DIR%\lost-found-1.0.0.jar" (
    echo JAR not found. Run backend\deploy-app.bat first.
    pause
    exit /b 1
)

if not exist "%APP_DIR%\.env" (
    echo Missing %APP_DIR%\.env
    echo Copy backend\.env.example to it and fill in real values.
    pause
    exit /b 1
)

rem Keep a startup script copy inside the deploy folder (start-app-*.bat -^> start-*.bat)
if "%IS_APP_COPY%"=="0" (
    set "SELF_NAME=%~nx0"
    set "COPY_NAME=%SELF_NAME:start-app-=start-%"
    copy /y "%~f0" "%APP_DIR%\%COPY_NAME%" >nul
)

rem Load runtime environment from .env (no credentials in tracked files)
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%APP_DIR%\.env") do (
    if not "%%a"=="" set "%%a=%%b"
)

cd /d "%APP_DIR%"
set "JAVA=java"
if exist "..\..\local\jdk\bin\java.exe" set "JAVA=..\..\local\jdk\bin\java.exe"

rem ---------- Start postgen (Node text cover service) ----------
if "%WITH_POSTGEN%"=="1" goto start_postgen
goto skip_postgen

:start_postgen
if /i "%POSTGEN_ENABLED%"=="false" goto skip_postgen
set "POSTGEN_DIR=%APP_DIR%\..\postgen-service"
set "POSTGEN_WORK_DIR=%APP_DIR%\..\postgen-work"
if "%POSTGEN_PORT%"=="" set "POSTGEN_PORT=3000"
if not exist "%POSTGEN_DIR%\server.js" (
    echo [postgen] server.js not found: %POSTGEN_DIR%\server.js
    pause
    exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
    echo [postgen] node not found. Install Node.js 18+.
    pause
    exit /b 1
)
rem If the port is already in use, ask the user before stopping anything.
set "POSTGEN_PORT_PID="
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort %POSTGEN_PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $c.OwningProcess }"`) do set "POSTGEN_PORT_PID=%%p"
if not defined POSTGEN_PORT_PID goto postgen_port_free
echo [postgen] Port %POSTGEN_PORT% is already in use by PID %POSTGEN_PORT_PID%.
set /p POSTGEN_KILL_ANSWER=Kill this process and start postgen? [y/N]: 
if /i "%POSTGEN_KILL_ANSWER%"=="y" goto postgen_kill_port
echo [postgen] Port %POSTGEN_PORT% is in use. Skipping postgen.
goto skip_postgen
:postgen_kill_port
powershell -NoProfile -Command "Stop-Process -Id %POSTGEN_PORT_PID% -Force -ErrorAction SilentlyContinue"
echo [postgen] Stopped PID %POSTGEN_PORT_PID%.
:postgen_port_free
if not exist "%POSTGEN_WORK_DIR%" mkdir "%POSTGEN_WORK_DIR%"
echo [postgen] starting http://localhost:%POSTGEN_PORT% ...
set "POSTGEN_PID_FILE=%TEMP%\lostfound-postgen.pid"
powershell -NoProfile -Command "$env:PORT='%POSTGEN_PORT%'; $env:WORK_DIR='%POSTGEN_WORK_DIR%'; $p = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory '%POSTGEN_DIR%' -NoNewWindow -PassThru -RedirectStandardOutput ('%POSTGEN_WORK_DIR%\postgen.log') -RedirectStandardError ('%POSTGEN_WORK_DIR%\postgen.err.log'); $p.Id | Out-File -Encoding ascii ($env:TEMP+'\lostfound-postgen.pid')"
if errorlevel 1 (
    echo [postgen] start command failed
    pause
    exit /b 1
)
rem Wait until ready: any HTTP response on GET / means the port is listening
set /a TRIES=0
:postgen_wait
set /a TRIES+=1
curl -s -o nul --max-time 1 http://localhost:%POSTGEN_PORT%
if not errorlevel 1 goto postgen_ready
if %TRIES% geq 30 (
    echo [postgen] start timeout
    if exist "%POSTGEN_WORK_DIR%\postgen.err.log" (
        echo [postgen] last lines of %POSTGEN_WORK_DIR%\postgen.err.log:
        powershell -NoProfile -Command "Get-Content -Tail 15 -Encoding UTF8 '%POSTGEN_WORK_DIR%\postgen.err.log'"
    )
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto postgen_wait
:postgen_ready
echo [postgen] ready
:skip_postgen

echo Starting backend: http://localhost:8080
echo Config: %APP_DIR%\config\application.yml
echo Logs:   %APP_DIR%\logs
"%JAVA%" -Dfile.encoding=UTF-8 -Dapp.home="%APP_DIR%" -jar lost-found-1.0.0.jar

rem Stop postgen after the backend exits
if "%WITH_POSTGEN%"=="1" (
    if exist "%TEMP%\lostfound-postgen.pid" (
        set /p POSTGEN_PID=<"%TEMP%\lostfound-postgen.pid"
        if not "%POSTGEN_PID%"=="" taskkill /PID %POSTGEN_PID% /T /F >nul 2>&1
        del "%TEMP%\lostfound-postgen.pid" >nul 2>&1
    )
)
