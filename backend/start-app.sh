#!/usr/bin/env sh
# Two identities: backend/start-app.sh (master) and backend/app/start.sh (deploy copy)
set -e
cd "$(dirname "$0")"
BASE="$(pwd)"
SCRIPT_NAME="$(basename "$0")"

if [ "$SCRIPT_NAME" = "start-app.sh" ]; then
  APP_DIR="$BASE/app"
else
  APP_DIR="$BASE"
fi

if [ ! -f "$APP_DIR/lost-found-1.0.0.jar" ]; then
  echo "JAR not found. Run backend/deploy-app.sh first."
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "Missing $APP_DIR/.env"
  echo "Copy backend/.env.example to it and fill in real values."
  exit 1
fi

# Keep a startup script copy inside the deploy folder
if [ "$SCRIPT_NAME" = "start-app.sh" ]; then
  cp -f "$0" "$APP_DIR/start.sh"
fi

cd "$APP_DIR"

# Load runtime environment from .env (no credentials in tracked files)
set -a
. ./.env
set +a

if [ -x "../../local/jdk/bin/java" ]; then
  JAVA="../../local/jdk/bin/java"
else
  JAVA="java"
fi

echo "Starting backend: http://localhost:8080"
echo "Config: $APP_DIR/config/application.yml"
echo "Logs:   $APP_DIR/logs"
exec "$JAVA" -Dfile.encoding=UTF-8 -Dapp.home="$APP_DIR" -jar lost-found-1.0.0.jar
