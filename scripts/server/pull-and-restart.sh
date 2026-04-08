#!/usr/bin/env bash
# =============================================================================
# RideOps – Pull nuove immagini e riavvio container (eseguito sul SERVER)
# Uso: ./scripts/server/pull-and-restart.sh [tag]
# =============================================================================
set -euo pipefail

RIDEOPS_DIR="/opt/rideops"
ENV_FILE="${RIDEOPS_DIR}/.env"
COMPOSE_FILE="${RIDEOPS_DIR}/docker-compose.prod.yml"
IMAGE_TAG="${1:-latest}"

cd "${RIDEOPS_DIR}"

echo "[$(date)] Deploy tag=${IMAGE_TAG}"

# Aggiorna il tag nelle variabili d'ambiente
export IMAGE_TAG="${IMAGE_TAG}"

echo "--- Pull immagini ---"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull backend frontend

echo "--- Riavvio container (zero-downtime: postgres non tocca) ---"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
    up -d --no-deps backend frontend nginx

echo "--- Pulizia immagini vecchie ---"
docker image prune -f

echo "[$(date)] Deploy completato."
