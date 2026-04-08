#!/usr/bin/env bash
# =============================================================================
# RideOps – Server Setup Script
# Ubuntu 22.04 LTS su Hetzner Cloud
# Esegui come root: bash install.sh
# =============================================================================
set -euo pipefail

RIDEOPS_DIR="/opt/rideops"
DEPLOY_USER="rideops"

echo "=== [1/8] Aggiornamento sistema ==="
apt-get update -q
apt-get upgrade -y -q

echo "=== [2/8] Installazione dipendenze base ==="
apt-get install -y -q \
    curl wget git ufw fail2ban \
    ca-certificates gnupg lsb-release \
    logrotate unattended-upgrades

echo "=== [3/8] Installazione Docker ==="
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -q
apt-get install -y -q \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "=== [4/8] Installazione Certbot ==="
apt-get install -y -q certbot

echo "=== [5/8] Creazione utente deploy '${DEPLOY_USER}' ==="
if ! id "${DEPLOY_USER}" &>/dev/null; then
    useradd --system --create-home --shell /bin/bash "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"

echo "=== [6/8] Struttura directoy /opt/rideops ==="
mkdir -p "${RIDEOPS_DIR}"/{nginx/conf.d,backups,scripts,logs}
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${RIDEOPS_DIR}"

echo "=== [7/8] Configurazione UFW (firewall) ==="
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh          # porta 22
ufw allow http         # porta 80
ufw allow https        # porta 443
ufw --force enable
ufw status verbose

echo "=== [8/8] Configurazione fail2ban ==="
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime  = 600
maxretry = 5
destemail = root@localhost
action = %(action_mwl)s

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
EOF

systemctl enable fail2ban
systemctl restart fail2ban

echo ""
echo "============================================================"
echo " Setup completato!"
echo " Prossimi step:"
echo "   1. Copia i file di configurazione in ${RIDEOPS_DIR}/"
echo "   2. Crea il file .env da .env.prod.example"
echo "   3. Esegui: ./scripts/obtain-cert.sh"
echo "   4. Esegui: ./scripts/deploy.sh"
echo "============================================================"
