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

# Carica variabili d'ambiente
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

# Termina connessioni attive e ricrea il database
docker exec "${CONTAINER}" psql -U "${POSTGRES_USER}" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid <> pg_backend_pid();" > /dev/null

# Ripristina il dump
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER}" psql \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --quiet

echo "[$(date)] Ripristino completato con successo."
echo ""
echo "Verifica:"
docker exec "${CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;"
