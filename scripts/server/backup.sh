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
RETENTION_DAYS=3

# Carica variabili d'ambiente
# shellcheck source=/dev/null
source "${ENV_FILE}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/rideops_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

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

# ── Istruzioni ripristino ─────────────────────────────────────────────────────
# Per ripristinare un backup:
#   gunzip -c /opt/rideops/backups/rideops_YYYYMMDD_HHMMSS.sql.gz \
#     | docker exec -i rideops-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
