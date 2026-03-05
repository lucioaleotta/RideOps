#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN_FILE="${ROOT_DIR}/.rideops_token"

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

usage() {
  cat <<'EOF'
RideOps dev helper

Uso:
  ./dev.sh help
  ./dev.sh up
  ./dev.sh down
  ./dev.sh restart
  ./dev.sh ps
  ./dev.sh logs [service]
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

  up)
    cd "$ROOT_DIR"
    compose_cmd --profile dev up --build -d
    ;;

  down)
    cd "$ROOT_DIR"
    compose_cmd --profile dev down
    ;;

  restart)
    cd "$ROOT_DIR"
    compose_cmd --profile dev down
    compose_cmd --profile dev up --build -d
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
