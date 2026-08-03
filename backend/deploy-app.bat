@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================
echo  Build backend and assemble backend\app
echo ============================================

echo [1/2] Building backend jar...
call mvn package -DskipTests -q
if errorlevel 1 (
    echo Backend build failed
    pause
    exit /b 1
)

echo [2/2] Assembling app directory...
if not exist "app" mkdir "app"
if not exist "app\config" mkdir "app\config"
if not exist "app\logs" mkdir "app\logs"
if not exist "app\uploads" mkdir "app\uploads"

copy /y "target\lost-found-1.0.0.jar" "app\lost-found-1.0.0.jar" >nul
if not exist "app\config\application.yml" (
    copy /y "src\main\resources\application.yml" "app\config\application.yml" >nul
)
if not exist "app\.env" (
    copy /y ".env.example" "app\.env" >nul
)
copy /y "start-app.bat" "app\start.bat" >nul
copy /y "start-app.sh" "app\start.sh" >nul
copy /y "start-app-with-postgen.bat" "app\start-with-postgen.bat" >nul
copy /y "start-app-with-postgen.sh" "app\start-with-postgen.sh" >nul
copy /y "start-app-without-postgen.bat" "app\start-without-postgen.bat" >nul
copy /y "start-app-without-postgen.sh" "app\start-without-postgen.sh" >nul

echo.
echo Done!
echo Start with:  backend\app\start.bat               [default: with postgen]
echo Or:          backend\start-app.bat               [default: with postgen]
echo No postgen:  backend\app\start-without-postgen.bat
echo Config:      backend\app\config\application.yml
pause
