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
TEMP_ENV_FILE=""

cleanup() {
    if [[ -n "${TEMP_ENV_FILE}" && -f "${TEMP_ENV_FILE}" ]]; then
        rm -f "${TEMP_ENV_FILE}"
    fi
}

trap cleanup EXIT

cd "${RIDEOPS_DIR}"

echo "[$(date)] Deploy tag=${IMAGE_TAG}"

# Aggiorna il tag nelle variabili d'ambiente
export IMAGE_TAG="${IMAGE_TAG}"

TEMP_ENV_FILE="$(mktemp)"
cp "${ENV_FILE}" "${TEMP_ENV_FILE}"

cat <<EOF >> "${TEMP_ENV_FILE}"
BREVO_API_KEY=${BREVO_API_KEY:-}
BREVO_SENDER_EMAIL=${BREVO_SENDER_EMAIL:-noreply@rideops.it}
BREVO_SENDER_NAME=${BREVO_SENDER_NAME:-RideOps}
BREVO_BASE_URL=${BREVO_BASE_URL:-https://api.brevo.com/v3}
BREVO_REPLY_TO=${BREVO_REPLY_TO:-support@rideops.it}
EOF

echo "--- Login a GHCR ---"
echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin

echo "--- Pull immagini ---"
docker compose -f "${COMPOSE_FILE}" --env-file "${TEMP_ENV_FILE}" pull backend frontend

echo "--- Sincronizzazione certificati SSL ---"
CERT_DIR="${RIDEOPS_DIR}/certs"
LE_LIVE="/etc/letsencrypt/live/rideops.it"
mkdir -p "${CERT_DIR}"
if [[ -f "${LE_LIVE}/fullchain.pem" ]]; then
    cp -f "${LE_LIVE}/fullchain.pem" "${CERT_DIR}/fullchain.pem"
    cp -f "${LE_LIVE}/privkey.pem"   "${CERT_DIR}/privkey.pem"
    chmod 644 "${CERT_DIR}/fullchain.pem"
    chmod 600 "${CERT_DIR}/privkey.pem"
    echo "Certificati copiati da ${LE_LIVE} in ${CERT_DIR}."
else
    echo "ATTENZIONE: certificati non trovati in ${LE_LIVE}. Nginx potrebbe non avviarsi."
fi

echo "--- Verifica e avvio postgres (se non in esecuzione) ---"
docker compose -f "${COMPOSE_FILE}" --env-file "${TEMP_ENV_FILE}" up -d --no-deps postgres
echo "Attendo che postgres sia healthy..."
for i in {1..20}; do
    STATUS=$(docker inspect --format '{{.State.Health.Status}}' rideops-postgres 2>/dev/null || echo "unknown")
    if [[ "${STATUS}" == "healthy" ]]; then
        echo "Postgres healthy."
        break
    fi
    echo "  attempt ${i}/20: ${STATUS}..."
    sleep 5
done

echo "--- Riavvio container backend, frontend, nginx ---"
docker compose -f "${COMPOSE_FILE}" --env-file "${TEMP_ENV_FILE}" \
    up -d --no-deps backend frontend nginx

echo "--- Pulizia immagini vecchie ---"
docker image prune -f

echo "[$(date)] Deploy completato."
