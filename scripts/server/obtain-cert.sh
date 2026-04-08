#!/usr/bin/env bash
# =============================================================================
# RideOps – Ottenimento certificato SSL Let's Encrypt
# Esegui PRIMA di avviare i container (Nginx non deve essere attivo)
# Esegui come root o con sudo: bash obtain-cert.sh
# =============================================================================
set -euo pipefail

DOMAIN="rideops.it"
EMAIL="admin@rideops.it"   # ← cambia con la tua email reale

echo "=== Ottenimento certificato per ${DOMAIN} ==="

# Certbot standalone: usa la porta 80 direttamente
# Assicurati che Nginx non sia in esecuzione
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

echo "=== Certificato ottenuto ==="
ls /etc/letsencrypt/live/"${DOMAIN}"/

echo "=== Configurazione rinnovo automatico (cron) ==="
# Certbot installa già un timer systemd in molte distro, verifica:
systemctl status certbot.timer 2>/dev/null || true

# Fallback: aggiungi cron manuale se il timer non è attivo
if ! systemctl is-active --quiet certbot.timer 2>/dev/null; then
    CRON_JOB="0 3 * * * certbot renew --quiet --deploy-hook 'docker compose -f /opt/rideops/docker-compose.prod.yml restart nginx'"
    (crontab -l 2>/dev/null | grep -v certbot; echo "$CRON_JOB") | crontab -
    echo "Cron aggiunto: $CRON_JOB"
fi

echo "=== Setup SSL completato ==="
