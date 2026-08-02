@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem Two identities: backend\start-app.bat (master) and backend\app\start.bat (deploy copy)
set "IS_APP_COPY=0"
if /i "%~nx0"=="start.bat" set "IS_APP_COPY=1"

if "%IS_APP_COPY%"=="0" (
    set "APP_DIR=%~dp0app"
) else (
    set "APP_DIR=%~dp0"
)
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

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

rem Keep a startup script copy inside the deploy folder
if "%IS_APP_COPY%"=="0" copy /y "%~f0" "%APP_DIR%\start.bat" >nul

rem Load runtime environment from .env (no credentials in tracked files)
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%APP_DIR%\.env") do (
    if not "%%a"=="" set "%%a=%%b"
)

cd /d "%APP_DIR%"
set "JAVA=java"
if exist "..\..\local\jdk\bin\java.exe" set "JAVA=..\..\local\jdk\bin\java.exe"

echo Starting backend: http://localhost:8080
echo Config: %APP_DIR%\config\application.yml
echo Logs:   %APP_DIR%\logs
"%JAVA%" -Dfile.encoding=UTF-8 -Dapp.home="%APP_DIR%" -jar lost-found-1.0.0.jar
