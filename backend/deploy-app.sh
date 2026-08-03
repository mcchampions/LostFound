#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"

echo "============================================"
echo " Build backend and assemble backend/app"
echo "============================================"

echo "[1/2] Building backend jar..."
mvn package -DskipTests -q

echo "[2/2] Assembling app directory..."
mkdir -p app/config app/logs app/uploads
cp -f target/lost-found-1.0.0.jar app/lost-found-1.0.0.jar
if [ ! -f app/config/application.yml ]; then
  cp -f src/main/resources/application.yml app/config/application.yml
fi
if [ ! -f app/.env ]; then
  cp -f .env.example app/.env
fi
cp -f start-app.sh app/start.sh
cp -f start-app.bat app/start.bat
cp -f start-app-with-postgen.sh app/start-with-postgen.sh
cp -f start-app-with-postgen.bat app/start-with-postgen.bat
cp -f start-app-without-postgen.sh app/start-without-postgen.sh
cp -f start-app-without-postgen.bat app/start-without-postgen.bat

echo ""
echo "Done!"
echo "Start with: backend/app/start.sh (Linux/macOS) or backend/app/start.bat (Windows) [default with postgen]"
echo "No postgen: backend/app/start-without-postgen.sh|.bat"
echo "Config:     backend/app/config/application.yml"
echo "Env:        backend/app/.env"
