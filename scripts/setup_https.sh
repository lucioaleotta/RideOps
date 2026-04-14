#!/bin/bash

set -e

DOMAIN="rideops.it"
EMAIL="lucio.a.leotta@gmail.com" # Cambia con la tua email

echo "Stopping Nginx (Docker Compose)..."
cd /opt/rideops || exit 1
docker compose -f docker-compose.prod.yml --env-file .env stop nginx

echo "Stopping Nginx (Docker Compose)..."
cd /opt/rideops || exit 1
docker compose -f docker-compose.prod.yml --env-file .env stop nginx

echo "Richiesta certificato SSL con Certbot..."
if ! command -v certbot &> /dev/null; then
    echo "Certbot non trovato. Installa certbot e riprova."
    exit 1
fi

certbot certonly --standalone --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN" -d "www.$DOMAIN"

echo "Certificato ottenuto. Assicurati che la configurazione Nginx punti a:"
echo "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "/etc/letsencrypt/live/$DOMAIN/privkey.pem"

echo "Avvio Nginx (Docker Compose)..."
docker compose -f docker-compose.prod.yml --env-file .env up -d nginx

echo "Avvio Nginx (Docker Compose)..."
docker compose -f docker-compose.prod.yml --env-file .env up -d nginx

echo "Setup HTTPS completato!"

echo ""
echo "###############################################################"
echo "PASSAGGI FINALI MANUALI (solo al primo rilascio del certificato):"
echo "1. Apri il file docker-compose.prod.yml e decommenta queste righe nella sezione nginx:"
echo "     - /etc/letsencrypt:/etc/letsencrypt:ro"
echo "     - /var/www/certbot:/var/www/certbot:ro"
echo "2. Salva il file."
echo "3. Riavvia solo Nginx con i comandi:"
echo "     cd /opt/rideops"
echo "     docker compose -f docker-compose.prod.yml --env-file .env up -d nginx"
echo "4. Verifica che HTTPS sia attivo su https://rideops.it"
echo "###############################################################"

###############################################################
# Documentazione: Gestione Nginx con Docker Compose
#
# Per fermare Nginx:
#   cd /opt/rideops && docker compose -f docker-compose.prod.yml --env-file .env stop nginx
#
# Per avviare Nginx:
#   cd /opt/rideops && docker compose -f docker-compose.prod.yml --env-file .env up -d nginx
#
# Per vedere i log:
#   docker logs rideops-nginx
#
# La configurazione Nginx si trova in:
#   ./nginx/nginx.conf e ./nginx/conf.d/
#
# I certificati SSL sono montati in /etc/letsencrypt nel container.
###############################################################
