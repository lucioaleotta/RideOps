#!/usr/bin/env bash
# =============================================================================
# RideOps – CLI per gestione del server di produzione
# Uso: ./scripts/rideops.sh <comando> [opzioni]
#
# Eseguito in LOCALE, si connette via SSH al server Hetzner.
# =============================================================================

SSH_HOST="91.98.196.151"
SSH_USER="root"
SSH_KEY="$HOME/.ssh/id_rsa"
RIDEOPS_DIR="/opt/rideops"
COMPOSE_FILE="${RIDEOPS_DIR}/docker-compose.prod.yml"
ENV_FILE="${RIDEOPS_DIR}/.env"

SSH="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST}"
SSH_CMD="${SSH} --"

# ---------------------------------------------------------------------------
# Colori
# ---------------------------------------------------------------------------
BOLD="\033[1m"; RESET="\033[0m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; CYAN="\033[36m"

_header() { echo -e "\n${BOLD}${CYAN}▶ $*${RESET}"; }
_ok()     { echo -e "${GREEN}✔ $*${RESET}"; }
_warn()   { echo -e "${YELLOW}⚠ $*${RESET}"; }
_err()    { echo -e "${RED}✘ $*${RESET}" >&2; }

# ---------------------------------------------------------------------------
# Comando: ps — stato di tutti i container
# ---------------------------------------------------------------------------
cmd_ps() {
  _header "Stato container"
  ${SSH} "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
}

# ---------------------------------------------------------------------------
# Comando: logs — log in tempo reale (Ctrl+C per uscire)
# Uso: logs [servizio] [-n righe]
# Servizi: backend | frontend | nginx | postgres (default: tutti)
# ---------------------------------------------------------------------------
cmd_logs() {
  local service="${1:-}"
  local lines="${2:-100}"
  _header "Log ${service:-tutti} (ultime ${lines} righe)"
  if [[ -n "$service" ]]; then
    ${SSH} "docker logs --tail=${lines} -f rideops-${service}"
  else
    ${SSH_CMD} "cd ${RIDEOPS_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} logs --tail=${lines} -f"
  fi
}

# ---------------------------------------------------------------------------
# Comando: restart — riavvio di uno o tutti i servizi
# Uso: restart [servizio]
# ---------------------------------------------------------------------------
cmd_restart() {
  local service="${1:-}"
  if [[ -n "$service" ]]; then
    _header "Riavvio $service"
    ${SSH_CMD} docker restart "rideops-${service}"
  else
    _header "Riavvio di tutti i servizi"
    ${SSH_CMD} "cd ${RIDEOPS_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} restart"
  fi
  _ok "Fatto"
}

# ---------------------------------------------------------------------------
# Comando: stop — stop selettivo o totale
# Uso: stop [servizio]
# ---------------------------------------------------------------------------
cmd_stop() {
  local service="${1:-}"
  if [[ -n "$service" ]]; then
    _header "Stop $service"
    ${SSH_CMD} docker stop "rideops-${service}"
  else
    _warn "Stai per fermare l'intero stack. Premi ENTER per confermare, Ctrl+C per annullare..."
    read -r
    _header "Stop stack completo"
    ${SSH_CMD} "cd ${RIDEOPS_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} down"
  fi
  _ok "Fatto"
}

# ---------------------------------------------------------------------------
# Comando: start — avvio dello stack (o singolo servizio)
# ---------------------------------------------------------------------------
cmd_start() {
  local service="${1:-}"
  if [[ -n "$service" ]]; then
    _header "Start $service"
    ${SSH_CMD} "cd ${RIDEOPS_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} up -d ${service}"
  else
    _header "Avvio stack completo"
    ${SSH_CMD} "cd ${RIDEOPS_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} up -d"
  fi
  _ok "Fatto"
}

# ---------------------------------------------------------------------------
# Comando: deploy — pull da git + rebuild + riavvio
# ---------------------------------------------------------------------------
cmd_deploy() {
  _header "Deploy: pull da git + rebuild immagini + riavvio"
  ${SSH_CMD} bash << 'REMOTE'
    set -euo pipefail
    cd /opt/rideops/src
    echo "--- git pull ---"
    git pull origin main
    echo "--- Build backend ---"
    docker build -t rideops-backend:latest ./backend
    echo "--- Build frontend ---"
    docker build -t rideops-frontend:latest ./frontend
    echo "--- Riavvio stack ---"
    docker compose -f /opt/rideops/docker-compose.prod.yml --env-file /opt/rideops/.env up -d --no-deps backend frontend nginx
    echo "--- Pulizia immagini dangling ---"
    docker image prune -f
    echo "Deploy completato."
REMOTE
  _ok "Deploy completato"
}

# ---------------------------------------------------------------------------
# Comando: db — shell psql interattiva
# ---------------------------------------------------------------------------
cmd_db() {
  _header "Connessione a PostgreSQL (digita \\q per uscire)"
  ${SSH} -t -- docker exec -it rideops-postgres psql -U rideops -d rideops
}

# ---------------------------------------------------------------------------
# Comando: db:query — esegui una query non interattiva
# Uso: db:query "SELECT count(*) FROM users;"
# ---------------------------------------------------------------------------
cmd_db_query() {
  local query="${1:?Usa: rideops.sh db:query \"<SQL>\"}"
  _header "Query: $query"
  ${SSH_CMD} "docker exec rideops-postgres psql -U rideops -d rideops -c \"${query}\""
}

# ---------------------------------------------------------------------------
# Comando: db:backup — backup manuale del database
# ---------------------------------------------------------------------------
cmd_db_backup() {
  _header "Backup database"
  ${SSH_CMD} "bash ${RIDEOPS_DIR}/scripts/server/backup.sh"
  _ok "Backup completato"
}

# ---------------------------------------------------------------------------
# Comando: health — check salute di tutti i container
# ---------------------------------------------------------------------------
cmd_health() {
  _header "Health check"
  ${SSH_CMD} bash << 'REMOTE'
    echo "=== Container status ==="
    docker ps --format 'table {{.Names}}\t{{.Status}}'
    echo ""
    echo "=== Backend actuator ==="
    docker exec rideops-backend wget -qO- http://localhost:8080/actuator/health 2>/dev/null || echo "  Non raggiungibile (ancora in avvio?)"
    echo ""
    echo "=== Nginx HTTP ==="
    curl -sI http://localhost/ | head -3
    echo ""
    echo "=== Spazio disco ==="
    df -h / | tail -1
    echo ""
    echo "=== Memoria ==="
    free -h | grep Mem
REMOTE
}

# ---------------------------------------------------------------------------
# Comando: ssl — ottieni certificato Let's Encrypt (dopo propagazione DNS)
# ---------------------------------------------------------------------------
cmd_ssl() {
  _header "Ottenimento certificato SSL"
  _warn "Assicurati che rideops.it punti a ${SSH_HOST} prima di procedere."
  echo -n "Verifico DNS... "
  if nslookup rideops.it 8.8.8.8 2>/dev/null | grep -q "${SSH_HOST}"; then
    _ok "DNS OK"
  else
    _err "DNS non ancora propagato. Riprova più tardi."
    exit 1
  fi
  ${SSH_CMD} "bash ${RIDEOPS_DIR}/scripts/server/obtain-cert.sh"
  _header "Attivazione configurazione HTTPS"
  ${SSH_CMD} bash << 'REMOTE'
    cd /opt/rideops/nginx/conf.d
    mv rideops.conf.ssl-disabled rideops.conf
    rm -f rideops-http.conf
    # Decommentare volumi SSL in docker-compose.prod.yml
    sed -i 's|# - /etc/letsencrypt|- /etc/letsencrypt|g' /opt/rideops/docker-compose.prod.yml
    sed -i 's|# - /var/www/certbot|- /var/www/certbot|g' /opt/rideops/docker-compose.prod.yml
    docker compose -f /opt/rideops/docker-compose.prod.yml --env-file /opt/rideops/.env up -d nginx
REMOTE
  _ok "HTTPS attivato su rideops.it"
}

# ---------------------------------------------------------------------------
# Comando: shell — shell bash sul server
# ---------------------------------------------------------------------------
cmd_shell() {
  _header "Shell remota su ${SSH_USER}@${SSH_HOST}"
  ${SSH}
}

# ---------------------------------------------------------------------------
# Comando: cron:backup — installa cron di backup automatico
# ---------------------------------------------------------------------------
cmd_cron_backup() {
  _header "Installazione cron backup notturno (ore 02:00)"
  ${SSH_CMD} bash << 'REMOTE'
    CRON_LINE="0 2 * * * /opt/rideops/scripts/server/backup.sh >> /opt/rideops/logs/backup.log 2>&1"
    mkdir -p /opt/rideops/logs
    ( crontab -l 2>/dev/null | grep -v "backup.sh"; echo "$CRON_LINE" ) | crontab -
    echo "Cron installato:"
    crontab -l | grep backup
REMOTE
  _ok "Fatto"
}

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
cmd_help() {
  echo -e "${BOLD}RideOps Server CLI${RESET}"
  echo -e "Uso: ${CYAN}./scripts/rideops.sh${RESET} <comando> [opzioni]\n"
  echo -e "  ${BOLD}ps${RESET}                     Stato di tutti i container"
  echo -e "  ${BOLD}logs${RESET} [svc] [n]         Log (follow) — svc: backend|frontend|nginx|postgres"
  echo -e "  ${BOLD}restart${RESET} [svc]          Riavvia un servizio (o tutti)"
  echo -e "  ${BOLD}stop${RESET} [svc]             Ferma un servizio (o lo stack intero)"
  echo -e "  ${BOLD}start${RESET} [svc]            Avvia un servizio (o lo stack intero)"
  echo -e "  ${BOLD}deploy${RESET}                 git pull + rebuild + riavvio"
  echo -e "  ${BOLD}health${RESET}                 Health check completo (container, disco, RAM)"
  echo -e "  ${BOLD}db${RESET}                     Shell psql interattiva"
  echo -e "  ${BOLD}db:query${RESET} \"<SQL>\"       Esegui una query SQL"
  echo -e "  ${BOLD}db:backup${RESET}              Backup manuale del database"
  echo -e "  ${BOLD}cron:backup${RESET}            Installa cron backup notturno (ore 02:00)"
  echo -e "  ${BOLD}ssl${RESET}                    Ottieni certificato Let's Encrypt + abilita HTTPS"
  echo -e "  ${BOLD}shell${RESET}                  Shell bash remota"
  echo ""
  echo -e "Esempi:"
  echo -e "  ${CYAN}./scripts/rideops.sh ps${RESET}"
  echo -e "  ${CYAN}./scripts/rideops.sh logs backend 200${RESET}"
  echo -e "  ${CYAN}./scripts/rideops.sh restart nginx${RESET}"
  echo -e "  ${CYAN}./scripts/rideops.sh db:query \"SELECT id, email FROM users LIMIT 10;\"${RESET}"
}

# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------
case "${1:-help}" in
  ps)           cmd_ps ;;
  logs)         cmd_logs "${2:-}" "${3:-100}" ;;
  restart)      cmd_restart "${2:-}" ;;
  stop)         cmd_stop "${2:-}" ;;
  start)        cmd_start "${2:-}" ;;
  deploy)       cmd_deploy ;;
  health)       cmd_health ;;
  db)           cmd_db ;;
  db:query)     cmd_db_query "${2:-}" ;;
  db:backup)    cmd_db_backup ;;
  cron:backup)  cmd_cron_backup ;;
  ssl)          cmd_ssl ;;
  shell)        cmd_shell ;;
  help|--help|-h) cmd_help ;;
  *)
    _err "Comando sconosciuto: ${1}"
    echo ""
    cmd_help
    exit 1
    ;;
esac
