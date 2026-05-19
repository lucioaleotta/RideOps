#!/usr/bin/env bash
# =============================================================================
# RideOps – Ripristino backup PostgreSQL
# Uso: ./restore.sh [percorso_backup.sql.gz]
#      Se omesso, mostra la lista dei backup disponibili e chiede quale usare.
# =============================================================================
set -euo pipefail

BACKUP_DIR="/opt/rideops/backups"
ENV_FILE="/opt/rideops/.env"
CONTAINER="rideops-postgres"
PRE_RESTORE_SNAPSHOT="${PRE_RESTORE_SNAPSHOT:-false}"

# Carica variabili d'ambiente
# shellcheck source=/dev/null
source "${ENV_FILE}"

# ── Selezione backup ──────────────────────────────────────────────────────────
if [[ -n "${1:-}" ]]; then
    BACKUP_FILE="$1"
else
    echo "Backup disponibili in ${BACKUP_DIR}:"
    echo ""
    ls -lht "${BACKUP_DIR}"/rideops_*.sql.gz 2>/dev/null | awk '{print NR")", $NF, $5, $6, $7, $8}' || {
        echo "Nessun backup trovato in ${BACKUP_DIR}"
        exit 1
    }
    echo ""
    read -rp "Inserisci il numero del backup da ripristinare: " CHOICE
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/rideops_*.sql.gz | sed -n "${CHOICE}p")
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
    echo "ERRORE: file non trovato: ${BACKUP_FILE}"
    exit 1
fi

# Se presente, verifica il checksum salvato accanto al backup.
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [[ -f "${CHECKSUM_FILE}" ]]; then
    EXPECTED_HASH="$(awk '{print $1}' "${CHECKSUM_FILE}" | head -n1)"
    ACTUAL_HASH="$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')"

    if [[ -z "${EXPECTED_HASH}" ]]; then
        echo "ERRORE: file checksum vuoto/non valido: ${CHECKSUM_FILE}"
        exit 1
    fi

    if [[ "${EXPECTED_HASH}" != "${ACTUAL_HASH}" ]]; then
        echo "ERRORE: checksum SHA-256 non valido per ${BACKUP_FILE}"
        echo "Atteso: ${EXPECTED_HASH}"
        echo "Reale : ${ACTUAL_HASH}"
        exit 1
    fi

    echo "Checksum SHA-256 verificato con successo."
else
    echo "WARN: checksum non trovato (${CHECKSUM_FILE}). Proseguo senza verifica hash registrato."
fi

if ! gzip -t "${BACKUP_FILE}"; then
    echo "ERRORE: archivio gzip corrotto o incompleto: ${BACKUP_FILE}"
    exit 1
fi

echo ""
echo "========================================================"
echo "  Backup selezionato: $(basename "${BACKUP_FILE}")"
echo "  Database target:    ${POSTGRES_DB}"
echo "  Container:          ${CONTAINER}"
echo "========================================================"
echo ""
read -rp "ATTENZIONE: il database corrente verrà SOVRASCRITTO. Continuare? [s/N] " CONFIRM
if [[ "${CONFIRM,,}" != "s" ]]; then
    echo "Ripristino annullato."
    exit 0
fi

echo ""
echo "[$(date)] Avvio ripristino da ${BACKUP_FILE}..."

if [[ "${PRE_RESTORE_SNAPSHOT}" == "true" ]]; then
    PRE_TS="$(date +"%Y%m%d_%H%M%S")"
    PRE_BACKUP_FILE="${BACKUP_DIR}/pre_restore_${PRE_TS}.sql.gz"
    echo "[$(date)] Creo snapshot pre-restore: ${PRE_BACKUP_FILE}"
    docker exec "${CONTAINER}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-password --format=plain | gzip > "${PRE_BACKUP_FILE}"
fi

# Termina connessioni attive e ricrea il database per un restore pulito.
docker exec "${CONTAINER}" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid <> pg_backend_pid();" > /dev/null

docker exec "${CONTAINER}" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
    "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";" > /dev/null

docker exec "${CONTAINER}" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
    "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";" > /dev/null

# Ripristina il dump
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER}" psql \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -v ON_ERROR_STOP=1 \
    --quiet

echo "[$(date)] Ripristino completato con successo."
echo ""
echo "Verifica:"
docker exec "${CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;"
