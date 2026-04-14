#!/bin/bash
# Copia i certificati SSL rinnovati da Let's Encrypt nella directory usata da Nginx in Docker
# Da eseguire dopo ogni rinnovo con Certbot

set -e

SRC_LIVE="/etc/letsencrypt/live/rideops.it"
SRC_ARCHIVE="/etc/letsencrypt/archive/rideops.it"
DEST="/opt/rideops/certs"

# Usa sempre i file più recenti dalla directory live (che sono symlink ai file in archive)
echo "Copia fullchain.pem e privkey.pem in $DEST..."
cp -f "$SRC_LIVE/fullchain.pem" "$DEST/fullchain.pem"
cp -f "$SRC_LIVE/privkey.pem" "$DEST/privkey.pem"
chmod 644 "$DEST/fullchain.pem"
chmod 600 "$DEST/privkey.pem"
echo "Certificati copiati con successo."

echo "Riavvio Nginx (Docker Compose)..."
docker compose -f /opt/rideops/docker-compose.prod.yml restart nginx
echo "Nginx riavviato. HTTPS ora usa i certificati aggiornati."
