#!/usr/bin/env sh
# Identity: backend/start-app*.sh (master) vs backend/app/start*.sh (deploy copy)
set -e
cd "$(dirname "$0")"
BASE="$(pwd)"
SCRIPT_NAME="$(basename "$0")"

case "$SCRIPT_NAME" in
  start-app.sh|start-app-with-postgen.sh|start-app-without-postgen.sh)
    APP_DIR="$BASE/app"
    ;;
  *)
    APP_DIR="$BASE"
    ;;
esac

# This script does NOT start postgen (cover generation will be disabled).
WITH_POSTGEN=0

if [ ! -f "$APP_DIR/lost-found-1.0.0.jar" ]; then
  echo "JAR not found. Run backend/deploy-app.sh first."
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "Missing $APP_DIR/.env"
  echo "Copy backend/.env.example to it and fill in real values."
  exit 1
fi

# Keep a startup script copy inside the deploy folder (start-app-*.sh -> start-*.sh)
case "$SCRIPT_NAME" in
  start-app.sh) COPY_NAME="start.sh" ;;
  start-app-with-postgen.sh) COPY_NAME="start-with-postgen.sh" ;;
  start-app-without-postgen.sh) COPY_NAME="start-without-postgen.sh" ;;
  *) COPY_NAME="$SCRIPT_NAME" ;;
esac
if [ "$APP_DIR" != "$BASE" ]; then
  cp -f "$0" "$APP_DIR/$COPY_NAME"
fi

cd "$APP_DIR"

# Load runtime environment from .env, then force postgen integration off
set -a
. ./.env
set +a
POSTGEN_ENABLED=false
export POSTGEN_ENABLED

if [ -x "../../local/jdk/bin/java" ]; then
  JAVA="../../local/jdk/bin/java"
else
  JAVA="java"
fi

echo "Starting backend: http://localhost:8080"
echo "Config: $APP_DIR/config/application.yml"
echo "Logs:   $APP_DIR/logs"
echo "[postgen] disabled (start-app-without-postgen.sh)"
"$JAVA" -Dfile.encoding=UTF-8 -Dapp.home="$APP_DIR" -jar lost-found-1.0.0.jar
