# ---------------------------------------------------------------------------
# Comando: sync-config — copia tutti i file di configurazione dal repo al server
# Uso: ./scripts/rideops.sh sync-config
# ---------------------------------------------------------------------------
cmd_sync_config() {
  _header "Sincronizzazione file di configurazione Nginx sul server"
  # Crea le cartelle di destinazione se non esistono
  ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "mkdir -p ${RIDEOPS_DIR}/nginx/conf.d"

  # Copia nginx.conf nella cartella nginx
  rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    ./nginx/nginx.conf \
    ${SSH_USER}@${SSH_HOST}:${RIDEOPS_DIR}/nginx/nginx.conf

  # Copia rideops.conf nella sottocartella conf.d
  rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    ./nginx/conf.d/rideops.conf \
    ${SSH_USER}@${SSH_HOST}:${RIDEOPS_DIR}/nginx/conf.d/rideops.conf

  _ok "Configurazione aggiornata!"
}
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
# Comando: db:backup:list-remote — lista backup su Hetzner Storage Box
# Uso: ./scripts/rideops.sh db:backup:list-remote
# ---------------------------------------------------------------------------
cmd_db_backup_list_remote() {
  _header "Lista backup remoti su Storage Box"
  ${SSH_CMD} bash << 'REMOTE'
    set -euo pipefail

    ENV_FILE="/opt/rideops/.env"
    if [[ -f "${ENV_FILE}" ]]; then
      # shellcheck source=/dev/null
      source "${ENV_FILE}"
    fi

    STORAGEBOX_HOST="${STORAGEBOX_HOST:-u594574.your-storagebox.de}"
    STORAGEBOX_USER="${STORAGEBOX_USER:-u594574}"
    STORAGEBOX_PATH="${STORAGEBOX_PATH:-backups/postgres}"
    STORAGEBOX_SSH_KEY="${STORAGEBOX_SSH_KEY:-/root/.ssh/id_ed25519}"
    STORAGEBOX_PORT="${STORAGEBOX_PORT:-23}"
    STORAGEBOX_STRICT_HOST_KEY_CHECKING="${STORAGEBOX_STRICT_HOST_KEY_CHECKING:-accept-new}"

    if [[ ! -f "${STORAGEBOX_SSH_KEY}" ]]; then
      echo "Chiave SSH Storage Box non trovata: ${STORAGEBOX_SSH_KEY}" >&2
      exit 1
    fi

    remote_dir_abs="${STORAGEBOX_PATH%/}"
    if [[ "${remote_dir_abs}" != /* ]]; then
      remote_dir_abs="/home/${remote_dir_abs}"
    fi

    if ssh -i "${STORAGEBOX_SSH_KEY}" \
      -p "${STORAGEBOX_PORT}" \
      -o "StrictHostKeyChecking=${STORAGEBOX_STRICT_HOST_KEY_CHECKING}" \
      "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
      "ls -lah '${remote_dir_abs}'"; then
      exit 0
    fi

    # Fallback: alcune Storage Box espongono una shell limitata e supportano meglio SFTP batch.
    sftp -i "${STORAGEBOX_SSH_KEY}" \
      -P "${STORAGEBOX_PORT}" \
      -o "StrictHostKeyChecking=${STORAGEBOX_STRICT_HOST_KEY_CHECKING}" \
      -b - "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<SFTP_CMDS
ls -lah ${remote_dir_abs}
bye
SFTP_CMDS
REMOTE
}

# ---------------------------------------------------------------------------
# Comando: db:pull-prod — ribalta il DB di produzione in locale con anonimizzazione
# Uso: ./scripts/rideops.sh db:pull-prod
#
# - Scarica il dump da prod via SSH pipe (nessun file temporaneo)
# - Ripristina nel postgres locale (rideops-postgres)
# - Anonimizza tutti i dati sensibili (vedi backend/script/anonymize_local.sql)
# - Imposta la password Password123! per tutte le utenze
# ---------------------------------------------------------------------------
cmd_db_pull_prod() {
  _header "Ribaltamento DB produzione → locale (con anonimizzazione)"
  _warn "Questa operazione SOVRASCRIVE il DB locale con i dati di produzione."
  _warn "I dati sensibili verranno anonimizzati. Password per tutte le utenze: Password123!"
  echo ""
  read -rp "Confermi? (scrivi 'si' per procedere) " confirm
  [[ "${confirm}" != "si" ]] && { _err "Annullato."; exit 1; }

  local SCRIPT_DIR
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local ANONYMIZE_SQL="${SCRIPT_DIR}/../backend/script/anonymize_local.sql"

  if [[ ! -f "${ANONYMIZE_SQL}" ]]; then
    _err "Script non trovato: ${ANONYMIZE_SQL}"
    exit 1
  fi

  # 1. Genera hash BCrypt di "Password123!" usando pgcrypto sul postgres locale
  _header "Generazione hash BCrypt per la password di sviluppo..."
  local DEV_HASH
  DEV_HASH=$(docker exec rideops-postgres psql -U rideops -d rideops -tAc \
    "CREATE EXTENSION IF NOT EXISTS pgcrypto; SELECT crypt('Password123!', gen_salt('bf', 10));" 2>/dev/null)
  if [[ -z "${DEV_HASH}" ]]; then
    _err "Impossibile generare l'hash BCrypt. Il container rideops-postgres è in esecuzione?"
    exit 1
  fi
  _ok "Hash generato."

  # 2. Ferma il backend locale per evitare connessioni attive durante il restore
  _header "Arresto backend locale..."
  docker stop rideops-backend 2>/dev/null || true

  # Termina eventuali connessioni residue al DB locale
  docker exec rideops-postgres psql -U rideops -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
     WHERE datname = 'rideops' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

  # 3. Dump da prod (formato custom) → pipe SSH → pg_restore locale
  _header "Download dump da produzione e import locale..."
  _warn "Potrebbe richiedere qualche minuto in base alla dimensione del DB."
  if ! ${SSH_CMD} "docker exec rideops-postgres pg_dump -U rideops -Fc rideops" | \
       docker exec -i rideops-postgres pg_restore \
         -U rideops -d rideops \
         --clean --if-exists --no-owner --no-privileges 2>/dev/null; then
    _warn "pg_restore completato con avvisi (normale con --clean su DB esistente)."
  fi
  _ok "Import completato."

  # 4. Anonimizzazione: usa heredoc per gestire i '$' nell'hash BCrypt
  _header "Anonimizzazione dati sensibili..."
  # shellcheck disable=SC2087  # l'espansione di ${DEV_HASH} è intenzionale qui
  docker exec -i rideops-postgres psql -U rideops -d rideops \
    -v "dev_password_hash=${DEV_HASH}" \
    -f - < "${ANONYMIZE_SQL}"
  _ok "Anonimizzazione completata."

  # 5. Riavvia il backend locale
  _header "Riavvio backend locale..."
  docker start rideops-backend

  _ok "Pronto. Accedi con qualsiasi utenza prod usando la password: Password123!"
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
# Comando: db:restore — ripristino interattivo da un backup
# Uso: ./scripts/rideops.sh db:restore [percorso_backup.sql.gz]
# ---------------------------------------------------------------------------
cmd_db_restore() {
  local backup_arg="${1:-}"
  _header "Ripristino database da backup"
  _warn "Verrà aperta una sessione SSH interattiva sul server."
  if [[ -n "${backup_arg}" ]]; then
    # File passato in locale → lo copiamo sul server prima del ripristino
    local remote_tmp="/tmp/$(basename "${backup_arg}")"
    _header "Upload backup su server..."
    rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
      "${backup_arg}" "${SSH_USER}@${SSH_HOST}:${remote_tmp}"
    ${SSH_CMD} "bash ${RIDEOPS_DIR}/scripts/server/restore.sh ${remote_tmp}"
    ${SSH_CMD} "rm -f ${remote_tmp}"
  else
    # Sessione interattiva — mostra lista backup sul server
    ${SSH} -t "bash ${RIDEOPS_DIR}/scripts/server/restore.sh"
  fi
  _ok "Ripristino completato."
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
# Comando: dr:check — diagnostica automatica disaster recovery
# Controlla server, container, DB, SSL e suggerisce l'azione corretta
# ---------------------------------------------------------------------------
cmd_dr_check() {
  _header "Diagnostica Disaster Recovery"
  local issues=0

  # ── 1. Raggiungibilità server ────────────────────────────────────────────
  echo -n "[1/5] Server raggiungibile... "
  if ! ping -c 1 -W 3 "${SSH_HOST}" &>/dev/null; then
    echo -e "${RED}NON RAGGIUNGIBILE${RESET}"
    echo ""
    _err "Il server non risponde al ping."
    echo "→ Controlla Hetzner Cloud Console: https://console.hetzner.cloud"
    echo "→ Se 'Off': fai Power On dalla console"
    echo "→ Se 'Running' ma non risponde: usa la Console web Hetzner per accedere"
    echo "→ Se irrecuperabile: lancia: ./scripts/rideops.sh dr:rebuild <NUOVO_IP>"
    exit 1
  fi
  echo -e "${GREEN}OK${RESET}"

  # ── 2. Stato container ───────────────────────────────────────────────────
  echo -n "[2/5] Container in esecuzione... "
  local ps_out
  ps_out=$(${SSH_CMD} "docker ps --format '{{.Names}}|{{.Status}}'" 2>/dev/null)
  local all_up=true
  for svc in rideops-postgres rideops-backend rideops-frontend rideops-nginx; do
    if ! echo "${ps_out}" | grep -q "^${svc}|Up"; then
      echo -e "${RED}PROBLEMA${RESET}"
      _warn "Container non healthy: ${svc}"
      echo "→ Stato:"
      ${SSH_CMD} "docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep rideops"
      echo ""
      echo "→ Azione rapida:"
      echo "   ./scripts/rideops.sh restart ${svc##rideops-}"
      echo "   ./scripts/rideops.sh logs ${svc##rideops-} 50"
      all_up=false
      issues=$((issues+1))
    fi
  done
  [[ "${all_up}" == true ]] && echo -e "${GREEN}OK${RESET}"

  # ── 3. Health database ───────────────────────────────────────────────────
  echo -n "[3/5] Database healthy... "
  local db_status
  db_status=$(${SSH_CMD} "docker inspect --format '{{.State.Health.Status}}' rideops-postgres 2>/dev/null || echo 'missing'")
  if [[ "${db_status}" != "healthy" ]]; then
    echo -e "${RED}${db_status}${RESET}"
    _warn "Postgres non è healthy (stato: ${db_status})"
    echo "→ Leggi i log: ./scripts/rideops.sh logs postgres 80"
    echo "→ Ripristino da backup: ./scripts/rideops.sh db:restore"
    issues=$((issues+1))
  else
    echo -e "${GREEN}OK${RESET}"
  fi

  # ── 4. HTTPS risponde ────────────────────────────────────────────────────
  echo -n "[4/5] HTTPS risponde (rideops.it)... "
  local http_code
  http_code=$(curl -o /dev/null -s -w "%{http_code}" --max-time 8 "https://rideops.it/" 2>/dev/null || echo "000")
  if [[ "${http_code}" != "200" && "${http_code}" != "301" && "${http_code}" != "302" ]]; then
    echo -e "${RED}HTTP ${http_code}${RESET}"
    _warn "Il sito non risponde correttamente (codice: ${http_code})"
    echo "→ Verifica nginx: ./scripts/rideops.sh logs nginx 50"
    echo "→ Verifica SSL:   ssh root@${SSH_HOST} 'certbot certificates'"
    echo "→ Fix cert:       ssh root@${SSH_HOST} 'bash /opt/rideops/scripts/copy_ssl_and_reload_nginx.sh'"
    issues=$((issues+1))
  else
    echo -e "${GREEN}HTTP ${http_code}${RESET}"
  fi

  # ── 5. Spazio disco ──────────────────────────────────────────────────────
  echo -n "[5/5] Spazio disco... "
  local disk_pct
  disk_pct=$(${SSH_CMD} "df / | awk 'NR==2{print \$5}' | tr -d '%'" 2>/dev/null || echo "0")
  if [[ "${disk_pct}" -ge 85 ]]; then
    echo -e "${RED}${disk_pct}% usato${RESET}"
    _warn "Disco quasi pieno (${disk_pct}%)"
    echo "→ Pulizia immagini: ssh root@${SSH_HOST} 'docker image prune -f'"
    echo "→ Pulizia backup:   ssh root@${SSH_HOST} 'find /opt/rideops/backups -mtime +3 -delete'"
    issues=$((issues+1))
  else
    echo -e "${GREEN}${disk_pct}% usato${RESET}"
  fi

  # ── Riepilogo ────────────────────────────────────────────────────────────
  echo ""
  if [[ "${issues}" -eq 0 ]]; then
    _ok "Tutto OK — nessun problema rilevato."
  else
    _warn "${issues} problema/i rilevato/i. Segui le istruzioni sopra."
    echo "   Per la guida completa: docs/DISASTER_RECOVERY.md"
  fi
}

# ---------------------------------------------------------------------------
# Comando: dr:rebuild <NUOVO_IP> — rebuild completo su un nuovo server Hetzner
# Eseguire SOLO se il server originale è irrecuperabile.
# ---------------------------------------------------------------------------
cmd_dr_rebuild() {
  local new_ip="${1:-}"
  if [[ -z "${new_ip}" ]]; then
    _err "Specifica l'IP del nuovo server: ./scripts/rideops.sh dr:rebuild <NUOVO_IP>"
    exit 1
  fi

  local new_ssh="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no root@${new_ip}"
  local new_scp="scp -i ${SSH_KEY} -o StrictHostKeyChecking=no"
  local new_rsync="rsync -avz -e 'ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no'"

  _header "Disaster Recovery — Rebuild su ${new_ip}"
  _warn   "ATTENZIONE: questo script configura un nuovo server da zero."
  echo    "Server target: root@${new_ip}"
  echo ""
  read -rp "Sei sicuro di voler procedere? [s/N] " confirm
  [[ "${confirm,,}" != "s" ]] && { echo "Annullato."; exit 0; }

  # ── Step 1: Verifica connessione ────────────────────────────────────────
  _header "[1/7] Verifica connessione SSH al nuovo server"
  if ! ${new_ssh} "echo 'SSH OK'" 2>/dev/null; then
    _err "Impossibile connettersi a root@${new_ip}. Verifica che:"
    echo "  - Il server sia avviato e raggiungibile"
    echo "  - La tua chiave SSH (${SSH_KEY}) sia autorizzata sul nuovo server"
    exit 1
  fi
  _ok "Connessione OK"

  # ── Step 2: Installa dipendenze base (Docker, Certbot, UFW) ─────────────
  _header "[2/7] Installazione dipendenze (Docker, Certbot, UFW, fail2ban)"
  ${new_scp} scripts/server/install.sh "root@${new_ip}:/tmp/install.sh"
  ${new_ssh} "bash /tmp/install.sh"
  _ok "Setup base completato"

  # ── Step 3: Crea struttura directory ────────────────────────────────────
  _header "[3/7] Creazione struttura /opt/rideops"
  ${new_ssh} "mkdir -p /opt/rideops/{nginx/conf.d,backups,scripts/server,logs,certs}"
  _ok "Directory create"

  # ── Step 4: Copia file di configurazione ────────────────────────────────
  _header "[4/7] Copia file di configurazione dal repository locale"
  rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    nginx/ "root@${new_ip}:/opt/rideops/nginx/"
  rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    scripts/server/ "root@${new_ip}:/opt/rideops/scripts/server/"
  rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    scripts/copy_ssl_and_reload_nginx.sh "root@${new_ip}:/opt/rideops/scripts/"
  ${new_scp} docker-compose.prod.yml "root@${new_ip}:/opt/rideops/docker-compose.prod.yml"
  ${new_ssh} "chmod +x /opt/rideops/scripts/server/*.sh /opt/rideops/scripts/*.sh"
  _ok "File copiati"

  # ── Step 5: File .env ────────────────────────────────────────────────────
  _header "[5/7] Configurazione .env"
  echo ""
  _warn "Devi creare manualmente il file /opt/rideops/.env sul nuovo server."
  echo "Contiene le credenziali di produzione (DB password, JWT secret, ecc.)."
  echo ""
  echo "Template:"
  cat << 'TEMPLATE'
POSTGRES_DB=rideops
POSTGRES_USER=rideops
POSTGRES_PASSWORD=<SEGRETO>
JWT_SECRET=<SEGRETO>
JWT_EXPIRATION_SECONDS=3600
ADMIN_EMAIL=<EMAIL>
ADMIN_PASSWORD=<SEGRETO>
ADMIN_USER_ID=1
GHCR_IMAGE_PREFIX=ghcr.io/lucioaleotta
IMAGE_TAG=latest
TEMPLATE
  echo ""
  read -rp "Premi INVIO dopo aver creato /opt/rideops/.env sul server (con 'chmod 600 .env')..." _
  if ! ${new_ssh} "test -f /opt/rideops/.env"; then
    _err "File .env non trovato. Crealo prima di continuare."
    exit 1
  fi
  _ok ".env trovato"

  # ── Step 6: Pull immagini e avvio stack ─────────────────────────────────
  _header "[6/7] Login GHCR, pull immagini, avvio stack"
  local ghcr_token
  read -rsp "Inserisci il GHCR_TOKEN (GitHub Personal Access Token con read:packages): " ghcr_token
  echo ""
  ${new_ssh} "echo '${ghcr_token}' | docker login ghcr.io -u lucioaleotta --password-stdin"
  ${new_ssh} "cd /opt/rideops && docker compose -f docker-compose.prod.yml --env-file .env pull"
  ${new_ssh} "cd /opt/rideops && docker compose -f docker-compose.prod.yml --env-file .env up -d"
  _ok "Stack avviato"

  # ── Step 7: Ripristino DB + cron backup ─────────────────────────────────
  _header "[7/7] Ripristino database e cron backup"
  echo ""
  echo "Vuoi ripristinare il database da un backup locale?"
  read -rp "Percorso backup locale (es. /path/to/rideops_20260415.sql.gz) [lascia vuoto per saltare]: " backup_path
  if [[ -n "${backup_path}" && -f "${backup_path}" ]]; then
    local remote_tmp="/tmp/$(basename "${backup_path}")"
    ${new_scp} "${backup_path}" "root@${new_ip}:${remote_tmp}"
    ${new_ssh} "bash /opt/rideops/scripts/server/restore.sh ${remote_tmp}"
    ${new_ssh} "rm -f ${remote_tmp}"
    _ok "Database ripristinato"
  else
    _warn "Nessun backup ripristinato — il DB parte vuoto (Flyway applica le migrazioni al primo avvio)."
  fi

  # Installa cron backup sul nuovo server
  SSH_HOST="${new_ip}" ${SSH_CMD/root@${SSH_HOST}/root@${new_ip}} bash << 'REMOTE'
    CRON_LINE="0 2 * * * /opt/rideops/scripts/server/backup.sh >> /opt/rideops/logs/backup.log 2>&1"
    mkdir -p /opt/rideops/logs
    ( crontab -l 2>/dev/null | grep -v "backup.sh"; echo "$CRON_LINE" ) | crontab -
REMOTE
  _ok "Cron backup installato"

  # ── Riepilogo finale ─────────────────────────────────────────────────────
  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${GREEN}║   Rebuild completato su ${new_ip}   ║${RESET}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo "Prossimi step MANUALI:"
  echo "  1. Aggiorna DNS: record A di rideops.it → ${new_ip}"
  echo "  2. Dopo propagazione DNS, ottieni SSL:"
  echo "     SSH_HOST=${new_ip} ./scripts/rideops.sh ssl"
  echo "  3. Aggiorna GitHub Secrets:"
  echo "     HETZNER_HOST → ${new_ip}"
  echo "  4. Verifica il sito: https://rideops.it"
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
  echo -e "  ${BOLD}db:backup:list-remote${RESET}  Lista file backup su Storage Box"
  echo -e "  ${BOLD}db:pull-prod${RESET}           Ribalta DB prod in locale con anonimizzazione (Password123!)"
  echo -e "  ${BOLD}db:restore${RESET} [file]       Ripristino interattivo da backup (default: lista server)"
  echo -e "  ${BOLD}cron:backup${RESET}            Installa cron backup notturno (ore 02:00)"
  echo -e "  ${BOLD}ssl${RESET}                    Ottieni certificato Let's Encrypt + abilita HTTPS"
  echo -e "  ${BOLD}shell${RESET}                  Shell bash remota"
  echo -e "  ${BOLD}sync-config${RESET}            Sincronizza nginx config dal repo al server"
  echo ""
  echo -e "${BOLD}Disaster Recovery:${RESET}"
  echo -e "  ${BOLD}dr:check${RESET}               Diagnostica automatica: server, DB, HTTPS, disco"
  echo -e "  ${BOLD}dr:rebuild${RESET} <IP>        Rebuild completo su nuovo server Hetzner"
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
  db:backup:list-remote) cmd_db_backup_list_remote ;;
  db:pull-prod) cmd_db_pull_prod ;;
  db:restore)   cmd_db_restore "${2:-}" ;;
  cron:backup)  cmd_cron_backup ;;
  ssl)          cmd_ssl ;;
  shell)        cmd_shell ;;
  sync-config)  cmd_sync_config ;;
  dr:check)     cmd_dr_check ;;
  dr:rebuild)   cmd_dr_rebuild "${2:-}" ;;
  help|--help|-h) cmd_help ;;
  *)
    _err "Comando sconosciuto: ${1}"
    echo ""
    cmd_help
    exit 1
    ;;
esac
