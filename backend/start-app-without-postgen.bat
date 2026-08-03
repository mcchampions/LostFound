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

rem This script does NOT start postgen (cover generation will be disabled).
set "WITH_POSTGEN=0"

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

rem Load runtime environment from .env, then force postgen integration off
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%APP_DIR%\.env") do (
    if not "%%a"=="" set "%%a=%%b"
)
set "POSTGEN_ENABLED=false"

cd /d "%APP_DIR%"
set "JAVA=java"
if exist "..\..\local\jdk\bin\java.exe" set "JAVA=..\..\local\jdk\bin\java.exe"

echo Starting backend: http://localhost:8080
echo Config: %APP_DIR%\config\application.yml
echo Logs:   %APP_DIR%\logs
echo [postgen] disabled (start-app-without-postgen.bat)
"%JAVA%" -Dfile.encoding=UTF-8 -Dapp.home="%APP_DIR%" -jar lost-found-1.0.0.jar
