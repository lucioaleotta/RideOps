#!/usr/bin/env bash
# =============================================================================
# RideOps – Backup PostgreSQL
# Esegui come utente rideops o root
# Cron suggerito: 0 2 * * * /opt/rideops/scripts/backup.sh >> /opt/rideops/logs/backup.log 2>&1
# =============================================================================
set -euo pipefail

BACKUP_DIR="/opt/rideops/backups"
COMPOSE_FILE="/opt/rideops/docker-compose.prod.yml"
ENV_FILE="/opt/rideops/.env"
CONTAINER="rideops-postgres"
RETENTION_DAYS=1

# Storage Box (opzionale)
# Abilita con STORAGEBOX_ENABLED=true nel file /opt/rideops/.env
STORAGEBOX_ENABLED="${STORAGEBOX_ENABLED:-false}"
STORAGEBOX_HOST="${STORAGEBOX_HOST:-u594574.your-storagebox.de}"
STORAGEBOX_USER="${STORAGEBOX_USER:-u594574}"
STORAGEBOX_PATH="${STORAGEBOX_PATH:-backups/postgres}"
STORAGEBOX_SSH_KEY="${STORAGEBOX_SSH_KEY:-/root/.ssh/id_ed25519}"
STORAGEBOX_PORT="${STORAGEBOX_PORT:-23}"
STORAGEBOX_STRICT_HOST_KEY_CHECKING="${STORAGEBOX_STRICT_HOST_KEY_CHECKING:-accept-new}"
STORAGEBOX_FAIL_ON_ERROR="${STORAGEBOX_FAIL_ON_ERROR:-false}"
RETENTION_REMOTE_DAYS="${RETENTION_REMOTE_DAYS:-7}"

# Carica variabili d'ambiente
# shellcheck source=/dev/null
source "${ENV_FILE}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/rideops_${TIMESTAMP}.sql.gz"

sync_to_storage_box() {
    if [[ "${STORAGEBOX_ENABLED}" != "true" ]]; then
        return 0
    fi

    if [[ -z "${STORAGEBOX_HOST}" || -z "${STORAGEBOX_USER}" ]]; then
        echo "[$(date)] WARN: Storage Box abilitato ma variabili mancanti (STORAGEBOX_HOST/STORAGEBOX_USER)."
        if [[ "${STORAGEBOX_FAIL_ON_ERROR}" == "true" ]]; then
            exit 1
        fi
        return 0
    fi

    if [[ ! -f "${STORAGEBOX_SSH_KEY}" ]]; then
        echo "[$(date)] WARN: Chiave SSH Storage Box non trovata: ${STORAGEBOX_SSH_KEY}"
        if [[ "${STORAGEBOX_FAIL_ON_ERROR}" == "true" ]]; then
            exit 1
        fi
        return 0
    fi

    local ssh_target="${STORAGEBOX_USER}@${STORAGEBOX_HOST}"
    local remote_dir="${STORAGEBOX_PATH%/}"
    local remote_dir_abs="${remote_dir}"
    local remote_file=""
    local ssh_opts=(
        -i "${STORAGEBOX_SSH_KEY}"
        -p "${STORAGEBOX_PORT}"
        -o "StrictHostKeyChecking=${STORAGEBOX_STRICT_HOST_KEY_CHECKING}"
    )

    if [[ "${remote_dir_abs}" != /* ]]; then
        remote_dir_abs="/home/${remote_dir_abs}"
    fi

    remote_file="${remote_dir_abs%/}/$(basename "${BACKUP_FILE}")"

    echo "[$(date)] Avvio upload su Storage Box: ${ssh_target}:${remote_dir}/"

    if ! ssh "${ssh_opts[@]}" "${ssh_target}" "mkdir -p '${remote_dir_abs}'"; then
        echo "[$(date)] WARN: impossibile creare la directory remota ${remote_dir_abs}"
        if [[ "${STORAGEBOX_FAIL_ON_ERROR}" == "true" ]]; then
            exit 1
        fi
        return 0
    fi

    if scp "${ssh_opts[@]}" "${BACKUP_FILE}" "${ssh_target}:${remote_dir_abs}/"; then
        local local_size
        local remote_size

        local_size="$(wc -c < "${BACKUP_FILE}" | tr -d '[:space:]')"
        remote_size="$(ssh "${ssh_opts[@]}" "${ssh_target}" "stat -c%s '${remote_file}'" 2>/dev/null || true)"

        if [[ -z "${remote_size}" || "${remote_size}" != "${local_size}" ]]; then
            echo "[$(date)] WARN: verifica integrita upload fallita (local=${local_size}, remote=${remote_size:-N/A})"
            if [[ "${STORAGEBOX_FAIL_ON_ERROR}" == "true" ]]; then
                exit 1
            fi
            return 0
        fi

        echo "[$(date)] Upload Storage Box completato: ${ssh_target}:${remote_file}"

        if ssh "${ssh_opts[@]}" "${ssh_target}" "find '${remote_dir_abs}' -name '*.sql.gz' -mtime +${RETENTION_REMOTE_DAYS} -delete"; then
            echo "[$(date)] Retention remota applicata: eliminati file > ${RETENTION_REMOTE_DAYS} giorni in ${remote_dir_abs}"
        else
            echo "[$(date)] WARN: retention remota fallita in ${remote_dir_abs}"
            if [[ "${STORAGEBOX_FAIL_ON_ERROR}" == "true" ]]; then
                exit 1
            fi
        fi

        return 0
    fi

    echo "[$(date)] WARN: upload Storage Box fallito"
    if [[ "${STORAGEBOX_FAIL_ON_ERROR}" == "true" ]]; then
        exit 1
    fi
}

mkdir -p "${BACKUP_DIR}"

FREE_KB="$(df -Pk "${BACKUP_DIR}" | awk 'NR==2 {print $4}')"
MIN_FREE_KB=512000
if [[ -z "${FREE_KB}" || "${FREE_KB}" -lt "${MIN_FREE_KB}" ]]; then
    echo "[$(date)] ERROR: spazio disco insufficiente in ${BACKUP_DIR} (richiesti almeno 500MB liberi)."
    exit 1
fi

echo "[$(date)] Avvio backup database..."

docker exec "${CONTAINER}" \
    pg_dump \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --no-password \
    --format=plain \
| gzip > "${BACKUP_FILE}"

echo "[$(date)] Backup completato: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# Rimozione backup più vecchi di RETENTION_DAYS giorni
find "${BACKUP_DIR}" -name "rideops_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date)] Backup più vecchi di ${RETENTION_DAYS} giorni rimossi."

sync_to_storage_box

# ── Istruzioni ripristino ─────────────────────────────────────────────────────
# Per ripristinare un backup:
#   gunzip -c /opt/rideops/backups/rideops_YYYYMMDD_HHMMSS.sql.gz \
#     | docker exec -i rideops-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
