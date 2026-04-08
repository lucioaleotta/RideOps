#!/usr/bin/env bash
# =============================================================================
# RideOps – Deploy locale (build + push su Docker Hub)
# Esegui dal tuo Mac prima di un rilascio manuale
# Uso: ./scripts/deploy-push.sh [tag]
# Es.: ./scripts/deploy-push.sh v1.2.0
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_TAG="${1:-latest}"

# Leggi DOCKER_HUB_USERNAME da .env locale se esiste
if [[ -f "${ROOT_DIR}/.env.local" ]]; then
    # shellcheck source=/dev/null
    source "${ROOT_DIR}/.env.local"
fi

DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:?Imposta DOCKER_HUB_USERNAME in .env.local}"

BACKEND_IMAGE="${DOCKER_HUB_USERNAME}/rideops-backend:${IMAGE_TAG}"
FRONTEND_IMAGE="${DOCKER_HUB_USERNAME}/rideops-frontend:${IMAGE_TAG}"

echo "=== Build backend → ${BACKEND_IMAGE} ==="
docker build \
    --platform linux/amd64 \
    -t "${BACKEND_IMAGE}" \
    "${ROOT_DIR}/backend"

echo "=== Build frontend → ${FRONTEND_IMAGE} ==="
docker build \
    --platform linux/amd64 \
    -t "${FRONTEND_IMAGE}" \
    "${ROOT_DIR}/frontend"

echo "=== Push immagini su Docker Hub ==="
docker push "${BACKEND_IMAGE}"
docker push "${FRONTEND_IMAGE}"

# Tagga anche come latest se è stato passato un tag specifico
if [[ "${IMAGE_TAG}" != "latest" ]]; then
    docker tag "${BACKEND_IMAGE}"  "${DOCKER_HUB_USERNAME}/rideops-backend:latest"
    docker tag "${FRONTEND_IMAGE}" "${DOCKER_HUB_USERNAME}/rideops-frontend:latest"
    docker push "${DOCKER_HUB_USERNAME}/rideops-backend:latest"
    docker push "${DOCKER_HUB_USERNAME}/rideops-frontend:latest"
fi

echo ""
echo "=== Immagini pubblicate. Esegui sul server: ==="
echo "   ssh rideops@91.98.196.151 'cd /opt/rideops && ./scripts/server/pull-and-restart.sh ${IMAGE_TAG}'"
