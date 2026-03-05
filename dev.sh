#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN_FILE="${ROOT_DIR}/.rideops_token"
STATE_DIR="${ROOT_DIR}/.rideops"
RUN_DIR="${STATE_DIR}/run"
LOG_DIR="${STATE_DIR}/logs"
BACKEND_PID_FILE="${RUN_DIR}/backend.pid"
FRONTEND_PID_FILE="${RUN_DIR}/frontend.pid"

ensure_state_dirs() {
  mkdir -p "$RUN_DIR" "$LOG_DIR"
}

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

read_pid() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] && cat "$pid_file" || true
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
  else
    return 1
  fi
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Errore: docker compose non trovato (né v2 né v1)."
    exit 1
  fi
}

db_start() {
  cd "$ROOT_DIR"
  compose_cmd --profile dev up -d postgres
}

db_stop() {
  cd "$ROOT_DIR"
  compose_cmd --profile dev stop postgres || true
}

db_restart() {
  db_stop
  db_start
}

backend_start_local() {
  ensure_state_dirs

  local existing_pid
  existing_pid="$(read_pid "$BACKEND_PID_FILE")"
  if [[ -n "$existing_pid" ]] && is_pid_running "$existing_pid"; then
    echo "Backend locale già in esecuzione (PID: ${existing_pid})."
    return 0
  fi

  if port_in_use 8080; then
    echo "Errore: porta 8080 già occupata. Ferma il processo/container che la usa e riprova."
    return 1
  fi

  local backend_log="${LOG_DIR}/backend.log"
  echo "Avvio backend locale... (log: ${backend_log})"

  (
    cd "$ROOT_DIR/backend"
    DB_HOST=localhost \
    DB_PORT=5432 \
    DB_NAME="${POSTGRES_DB:-rideops}" \
    DB_USER="${POSTGRES_USER:-rideops}" \
    DB_PASSWORD="${POSTGRES_PASSWORD:-rideops}" \
    SERVER_PORT=8080 \
    SPRING_PROFILES_ACTIVE=dev \
    nohup mvn spring-boot:run > "$backend_log" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  )

  echo "Backend locale avviato. PID: $(cat "$BACKEND_PID_FILE")"
}

frontend_start_local() {
  ensure_state_dirs

  local existing_pid
  existing_pid="$(read_pid "$FRONTEND_PID_FILE")"
  if [[ -n "$existing_pid" ]] && is_pid_running "$existing_pid"; then
    echo "Frontend locale già in esecuzione (PID: ${existing_pid})."
    return 0
  fi

  if port_in_use 5173; then
    echo "Errore: porta 5173 già occupata. Ferma il processo/container che la usa e riprova."
    return 1
  fi

  local frontend_log="${LOG_DIR}/frontend.log"
  echo "Avvio frontend locale... (log: ${frontend_log})"

  (
    cd "$ROOT_DIR/frontend"
    if [[ ! -d node_modules ]]; then
      npm install >/dev/null
    fi
    BACKEND_URL=http://localhost:8080 nohup npm run dev -- --port 5173 > "$frontend_log" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
  )

  echo "Frontend locale avviato. PID: $(cat "$FRONTEND_PID_FILE")"
}

stop_process() {
  local pid_file="$1"
  local name="$2"

  local pid
  pid="$(read_pid "$pid_file")"
  if [[ -z "$pid" ]]; then
    echo "${name}: nessun PID file trovato."
    return 0
  fi

  if ! is_pid_running "$pid"; then
    echo "${name}: processo non attivo, pulisco PID file."
    rm -f "$pid_file"
    return 0
  fi

  kill "$pid" >/dev/null 2>&1 || true
  for _ in {1..20}; do
    if ! is_pid_running "$pid"; then
      break
    fi
    sleep 0.2
  done

  if is_pid_running "$pid"; then
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi

  rm -f "$pid_file"
  echo "${name}: fermato."
}

backend_stop_local() {
  stop_process "$BACKEND_PID_FILE" "Backend locale"
}

frontend_stop_local() {
  stop_process "$FRONTEND_PID_FILE" "Frontend locale"
}

local_status() {
  local backend_pid frontend_pid
  backend_pid="$(read_pid "$BACKEND_PID_FILE")"
  frontend_pid="$(read_pid "$FRONTEND_PID_FILE")"

  if [[ -n "$backend_pid" ]] && is_pid_running "$backend_pid"; then
    echo "Backend locale: UP (PID ${backend_pid})"
  else
    echo "Backend locale: DOWN"
  fi

  if [[ -n "$frontend_pid" ]] && is_pid_running "$frontend_pid"; then
    echo "Frontend locale: UP (PID ${frontend_pid})"
  else
    echo "Frontend locale: DOWN"
  fi

  cd "$ROOT_DIR"
  compose_cmd --profile dev ps postgres
}

usage() {
  cat <<'EOF'
RideOps dev helper

Uso:
  ./dev.sh help
  ./dev.sh start
  ./dev.sh stop
  ./dev.sh restart
  ./dev.sh status
  ./dev.sh db-start
  ./dev.sh db-stop
  ./dev.sh db-restart
  ./dev.sh db-logs
  ./dev.sh backend-start
  ./dev.sh backend-stop
  ./dev.sh backend-restart
  ./dev.sh backend-logs
  ./dev.sh frontend-start
  ./dev.sh frontend-stop
  ./dev.sh frontend-restart
  ./dev.sh frontend-logs
  ./dev.sh up            # stack full container (legacy)
  ./dev.sh down          # stack full container (legacy)
  ./dev.sh ps            # stack full container (legacy)
  ./dev.sh logs [svc]    # stack full container (legacy)
  ./dev.sh backend-test
  ./dev.sh frontend-build
  ./dev.sh check
  ./dev.sh login [email] [password]
  ./dev.sh me [token]
  ./dev.sh ping-admin [token]
  ./dev.sh ping-gestionale [token]
  ./dev.sh ping-driver [token]
  ./dev.sh logout

Default login:
  email: admin@rideops.local
  password: ChangeMe123!
EOF
}

ensure_token() {
  local token="${1:-}"
  if [[ -n "$token" ]]; then
    printf '%s' "$token"
    return 0
  fi
  if [[ -f "$TOKEN_FILE" ]]; then
    cat "$TOKEN_FILE"
    return 0
  fi
  echo "Errore: token non fornito e nessun token salvato in ${TOKEN_FILE}."
  exit 1
}

parse_token() {
  local payload="$1"
  if command -v jq >/dev/null 2>&1; then
    echo "$payload" | jq -r '.accessToken // empty'
  else
    echo "$payload" | sed -n 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
  fi
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  help|-h|--help)
    usage
    ;;

  start)
    cd "$ROOT_DIR"
    compose_cmd --profile dev stop backend frontend >/dev/null 2>&1 || true
    db_start
    backend_start_local
    frontend_start_local
    echo "Local stack avviato: DB container + backend/frontend locali."
    ;;

  stop)
    frontend_stop_local
    backend_stop_local
    db_stop
    echo "Local stack fermato."
    ;;

  restart)
    frontend_stop_local
    backend_stop_local
    db_restart
    backend_start_local
    frontend_start_local
    echo "Local stack riavviato."
    ;;

  status)
    local_status
    ;;

  db-start)
    db_start
    ;;

  db-stop)
    db_stop
    ;;

  db-restart)
    db_restart
    ;;

  db-logs)
    cd "$ROOT_DIR"
    compose_cmd --profile dev logs -f postgres
    ;;

  backend-start)
    backend_start_local
    ;;

  backend-stop)
    backend_stop_local
    ;;

  backend-restart)
    backend_stop_local
    backend_start_local
    ;;

  backend-logs)
    ensure_state_dirs
    tail -f "${LOG_DIR}/backend.log"
    ;;

  frontend-start)
    frontend_start_local
    ;;

  frontend-stop)
    frontend_stop_local
    ;;

  frontend-restart)
    frontend_stop_local
    frontend_start_local
    ;;

  frontend-logs)
    ensure_state_dirs
    tail -f "${LOG_DIR}/frontend.log"
    ;;

  up)
    cd "$ROOT_DIR"
    compose_cmd --profile dev up --build -d
    ;;

  down)
    cd "$ROOT_DIR"
    compose_cmd --profile dev down
    ;;

  ps)
    cd "$ROOT_DIR"
    compose_cmd --profile dev ps
    ;;

  logs)
    cd "$ROOT_DIR"
    if [[ $# -gt 0 ]]; then
      compose_cmd --profile dev logs -f "$1"
    else
      compose_cmd --profile dev logs -f
    fi
    ;;

  backend-test)
    cd "$ROOT_DIR/backend"
    mvn -B verify
    ;;

  frontend-build)
    cd "$ROOT_DIR/frontend"
    npm install
    npm run build
    ;;

  check)
    cd "$ROOT_DIR/backend"
    mvn -B verify
    cd "$ROOT_DIR/frontend"
    npm install
    npm run build
    ;;

  login)
    local_email="${1:-admin@rideops.local}"
    local_password="${2:-ChangeMe123!}"

    response="$(curl -sS -X POST "http://localhost:8080/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"${local_email}\",\"password\":\"${local_password}\"}")"

    token="$(parse_token "$response")"
    if [[ -z "$token" ]]; then
      echo "Login fallito. Risposta:"
      echo "$response"
      exit 1
    fi

    printf '%s' "$token" > "$TOKEN_FILE"
    echo "Login OK. Token salvato in ${TOKEN_FILE}"
    ;;

  me)
    token="$(ensure_token "${1:-}")"
    curl -sS "http://localhost:8080/auth/me" \
      -H "Authorization: Bearer ${token}"
    echo
    ;;

  ping-admin)
    token="$(ensure_token "${1:-}")"
    curl -sS "http://localhost:8080/admin/ping" \
      -H "Authorization: Bearer ${token}"
    echo
    ;;

  ping-gestionale)
    token="$(ensure_token "${1:-}")"
    curl -sS "http://localhost:8080/gestionale/ping" \
      -H "Authorization: Bearer ${token}"
    echo
    ;;

  ping-driver)
    token="$(ensure_token "${1:-}")"
    curl -sS "http://localhost:8080/driver/ping" \
      -H "Authorization: Bearer ${token}"
    echo
    ;;

  logout)
    rm -f "$TOKEN_FILE"
    echo "Token locale rimosso (${TOKEN_FILE})."
    ;;

  *)
    echo "Comando non riconosciuto: $cmd"
    echo
    usage
    exit 1
    ;;
esac
