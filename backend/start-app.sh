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

# Default: start postgen (text cover service) together with backend.
# Use start-app-without-postgen.sh to skip it.
WITH_POSTGEN=1

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

# Load runtime environment from .env (no credentials in tracked files)
set -a
. ./.env
set +a

if [ -x "../../local/jdk/bin/java" ]; then
  JAVA="../../local/jdk/bin/java"
else
  JAVA="java"
fi

POSTGEN_PID_FILE="${TMPDIR:-/tmp}/lostfound-postgen.pid"

start_postgen() {
  if [ "${POSTGEN_ENABLED:-true}" != "true" ]; then
    echo "[postgen] POSTGEN_ENABLED=false, skip"
    return 0
  fi
  POSTGEN_DIR="$APP_DIR/../postgen-service"
  POSTGEN_WORK_DIR="${POSTGEN_WORK_DIR:-$APP_DIR/../postgen-work}"
  POSTGEN_PORT="${POSTGEN_PORT:-3000}"
  if [ ! -f "$POSTGEN_DIR/server.js" ]; then
    echo "[postgen] not found: $POSTGEN_DIR/server.js, skip"
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "[postgen] node not found, skip"
    return 0
  fi
  mkdir -p "$POSTGEN_WORK_DIR"
  echo "[postgen] starting http://localhost:$POSTGEN_PORT ..."
  (
    cd "$POSTGEN_DIR"
    PORT="$POSTGEN_PORT" WORK_DIR="$POSTGEN_WORK_DIR" \
      nohup node server.js >>"$POSTGEN_WORK_DIR/postgen.log" 2>&1 &
    echo $! > "$POSTGEN_PID_FILE"
  )
  # Wait until ready: any HTTP response on GET / means the port is listening
  i=1
  while [ "$i" -le 30 ]; do
    if curl -s -o /dev/null --max-time 1 "http://localhost:$POSTGEN_PORT"; then
      echo "[postgen] ready http://localhost:$POSTGEN_PORT"
      return 0
    fi
    sleep 1
    i=$((i+1))
  done
  echo "[postgen] start timeout, continue with backend"
}

stop_postgen() {
  if [ -f "$POSTGEN_PID_FILE" ]; then
    kill "$(cat "$POSTGEN_PID_FILE")" 2>/dev/null || true
    rm -f "$POSTGEN_PID_FILE"
  fi
}

trap stop_postgen EXIT INT TERM
start_postgen

echo "Starting backend: http://localhost:8080"
echo "Config: $APP_DIR/config/application.yml"
echo "Logs:   $APP_DIR/logs"
"$JAVA" -Dfile.encoding=UTF-8 -Dapp.home="$APP_DIR" -jar lost-found-1.0.0.jar
