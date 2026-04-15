# RideOps – Disaster Recovery

Procedure operative per i tre scenari critici di produzione.  
Server: **Hetzner CX23** — IP: `91.98.196.151` — Stack: Docker Compose + PostgreSQL 16 + Nginx.

---

## Indice rapido

| Sintomo | Scenario |
|--------|----------|
| Il server non risponde a SSH, ping, HTTP | → [Scenario 1: Server down](#scenario-1-server-down-totale) |
| `docker ps` funziona, ma postgres è `Restarting`/`Exited` | → [Scenario 2: Database down](#scenario-2-database-down-o-non-risponde) |
| Postgres è healthy, ma il sito restituisce errori o è irraggiungibile | → [Scenario 3: Sito non risponde](#scenario-3-sito-non-risponde) |

---

## Scenario 1: Server down totale

**Sintomi:** nessuna risposta a `ping 91.98.196.151`, SSH timeout, sito irraggiungibile.

### Fase 1 – Diagnosi (2 minuti)

```bash
# Ping
ping -c 4 91.98.196.151

# Verifica dalla Hetzner Cloud Console
# https://console.hetzner.cloud → Servers → ubuntu-4gb-nbg1-4
# Guarda: Status (Running/Off), Console (accesso web emergenza)
```

Se **Hetzner Console mostra il server "Running"** ma non risponde: è un problema OS/kernel.  
Usa la **Console web Hetzner** (tasto "Console" nella UI) per accedere senza SSH.

Se il **server è "Off"**: riavvialo dalla Console → **Power On**.

---

### Fase 2a – Riavvio del server (se era spento o congelato)

1. Hetzner Console → **Reboot** (graceful) oppure **Power cycle** (hard reset)
2. Attendi 60–90 secondi
3. Verifica SSH:
   ```bash
   ssh root@91.98.196.151
   ```
4. Verifica i container:
   ```bash
   ./scripts/rideops.sh ps
   ```
   I container hanno `restart: unless-stopped` — ripartono automaticamente.  
   Se non sono partiti:
   ```bash
   ssh root@91.98.196.151 "cd /opt/rideops && docker compose -f docker-compose.prod.yml --env-file .env up -d"
   ```
5. Verifica il sito:
   ```bash
   ./scripts/rideops.sh health
   ```

---

### Fase 2b – Rebuild su nuovo server (server irrecuperabile)

Da eseguire se il server è distrutto e non recuperabile. Tempo stimato: **~15–20 minuti**.

#### Step 1 – Crea nuovo server Hetzner

- Hetzner Console → **Add Server**
- OS: Ubuntu 22.04 LTS
- Tipo: CX23 (4GB RAM, 2 CPU, 40GB)
- Location: Nbg1 (EU)
- SSH key: carica la tua chiave pubblica
- Nota il nuovo IP

> Se hai un Floating IP Hetzner associato a `rideops.it`: riassegnalo al nuovo server  
> → reindirizza il traffico senza cambiare il DNS.  
> Se non hai un Floating IP: aggiorna il record A del dominio con il nuovo IP.

#### Step 2 – Setup base del server

```bash
# Copia e lancia lo script di installazione
scp scripts/server/install.sh root@NUOVO_IP:/tmp/install.sh
ssh root@NUOVO_IP "bash /tmp/install.sh"
```

Lo script installa: Docker, Certbot, UFW (firewall 22/80/443), fail2ban.

#### Step 3 – Crea la struttura directory e i file di configurazione

```bash
# Crea le directory
ssh root@NUOVO_IP "mkdir -p /opt/rideops/{nginx/conf.d,backups,scripts/server,logs,certs}"

# Copia i file di configurazione dal repository locale
rsync -avz -e "ssh" \
  nginx/ scripts/ docker-compose.prod.yml \
  root@NUOVO_IP:/opt/rideops/

# Rendi eseguibili gli script
ssh root@NUOVO_IP "chmod +x /opt/rideops/scripts/server/*.sh /opt/rideops/scripts/*.sh"
```

#### Step 4 – Crea il file .env

```bash
# Crea /opt/rideops/.env con le variabili di produzione
ssh root@NUOVO_IP "cat > /opt/rideops/.env" << 'EOF'
POSTGRES_DB=rideops
POSTGRES_USER=rideops
POSTGRES_PASSWORD=<SEGRETO>
JWT_SECRET=<SEGRETO>
JWT_EXPIRATION_SECONDS=3600
ADMIN_EMAIL=<EMAIL>
ADMIN_PASSWORD=<SEGRETO>
ADMIN_USER_ID=1
GHCR_IMAGE_PREFIX=ghcr.io/lucioaleotta
IMAGE_TAG=latest
EOF

ssh root@NUOVO_IP "chmod 600 /opt/rideops/.env"
```

> Le password si trovano in: GitHub Actions Secrets → `HETZNER_*` / nel vecchio `.env` se hai fatto backup.

#### Step 5 – Login GHCR e pull immagini

```bash
ssh root@NUOVO_IP "
  echo TOKEN | docker login ghcr.io -u lucioaleotta --password-stdin
  cd /opt/rideops
  docker compose -f docker-compose.prod.yml --env-file .env pull
  docker compose -f docker-compose.prod.yml --env-file .env up -d
"
```

#### Step 6 – Ripristina il database dall'ultimo backup

```bash
# Scarica il backup più recente dal vecchio server (se ancora accessibile)
# oppure usa una copia locale salvata in precedenza
./scripts/rideops.sh db:restore /path/to/rideops_YYYYMMDD_HHMMSS.sql.gz
```

Se il **vecchio server non è accessibile** e non hai copie locali, il database parte vuoto  
(Flyway applicherà le migrazioni al primo avvio del backend).

#### Step 7 – Ottieni certificato SSL

```bash
# Dopo propagazione DNS (rideops.it → nuovo IP)
./scripts/rideops.sh ssl
```

#### Step 8 – Reinstalla il cron backup

```bash
./scripts/rideops.sh cron:backup
```

#### Step 9 – Aggiorna GitHub Actions Secrets

In GitHub → Settings → Secrets → Actions:
- `HETZNER_HOST` → nuovo IP
- `HETZNER_SSH_KEY` → chiave SSH del nuovo server (se è diversa)

---

## Scenario 2: Database down o non risponde

**Sintomi:** sito restituisce `503` o errori di connessione, backend log mostra  
`PSQLException`, `UnknownHostException: postgres`, o il container postgres è `Exited`/`Restarting`.

### Diagnosi rapida

```bash
./scripts/rideops.sh ps
# Cerca: rideops-postgres — deve essere "Up (healthy)"

./scripts/rideops.sh logs postgres 50
# Cerca: FATAL, PANIC, "could not write to file"
```

---

### Caso A: Postgres in crash loop (`Restarting`)

```bash
# Ferma il container per leggere i log senza spam
ssh root@91.98.196.151 "docker stop rideops-postgres"
ssh root@91.98.196.151 "docker logs rideops-postgres --tail 80"
```

**Errore — `could not write to file` / `No space left on device`:**
```bash
./scripts/rideops.sh health               # Controlla disco
ssh root@91.98.196.151 "docker system prune -f"          # Rimuovi immagini inutilizzate
ssh root@91.98.196.151 "find /opt/rideops/backups -mtime +7 -delete"  # Cancella backup vecchi
ssh root@91.98.196.151 "docker start rideops-postgres"
```

**Errore — corruzione dati (`invalid page`, `PANIC: could not locate a valid checkpoint`):**
→ vedi [Caso C: Ripristino da backup](#caso-c-ripristino-da-backup).

**Errore — permessi volume (`Permission denied`):**
```bash
ssh root@91.98.196.151 "docker volume inspect rideops_postgres-data"
# Se il volume risulta corrotto, forza rimozione e ripristina da backup
```

---

### Caso B: Postgres in stato `Created` (non avviato)

```bash
ssh root@91.98.196.151 "cd /opt/rideops && \
  docker compose -f docker-compose.prod.yml --env-file .env up -d postgres"

# Attendi healthy (~30s) poi riavvia il backend
sleep 30
ssh root@91.98.196.151 "cd /opt/rideops && \
  docker compose -f docker-compose.prod.yml --env-file .env up -d --no-deps backend"
```

---

### Caso C: Ripristino da backup

Da eseguire quando il database è corrotto o i dati sono persi.

```bash
# Lista backup disponibili + ripristino interattivo (raccomandato)
./scripts/rideops.sh db:restore
```

Dopo il ripristino, lo script mostra una verifica del conteggio delle righe per tabella.  
Se la verifica mostra dati plausibili, riavvia il backend:

```bash
ssh root@91.98.196.151 "cd /opt/rideops && \
  docker compose -f docker-compose.prod.yml --env-file .env restart backend"
```

> **Nota:** il backup più recente è al massimo delle 02:00 della notte precedente.  
> I dati inseriti dopo quell'ora saranno persi.

---

### Caso D: Postgres healthy ma backend non si connette

```bash
./scripts/rideops.sh logs backend 100
# Cerca: "Connection refused", "UnknownHostException"

# Verifica che backend e postgres siano sulla stessa rete Docker
ssh root@91.98.196.151 "docker network inspect rideops_backend-net"
# deve listare sia rideops-postgres che rideops-backend

# Riavvia il backend (risolve il problema di rete transitorio)
./scripts/rideops.sh restart backend
```

---

## Scenario 3: Sito non risponde

**Sintomi:** browser mostra `ERR_CONNECTION_REFUSED`, `504 Gateway Timeout`, `502 Bad Gateway`,  
o la pagina non si carica affatto.

### Diagnosi rapida (eseguire in ordine)

```bash
# 1. Il server è raggiungibile?
ping -c 2 91.98.196.151

# 2. La porta 443 risponde?
curl -I --max-time 10 https://rideops.it/

# 3. Stato container
./scripts/rideops.sh ps

# 4. Health check completo
./scripts/rideops.sh health
```

---

### Caso A: Nginx down (`Exited` o `Restarting`)

```bash
./scripts/rideops.sh logs nginx 50
```

**Errore SSL — `cannot load certificate /etc/nginx/certs/fullchain.pem`:**
```bash
ssh root@91.98.196.151 "
  mkdir -p /opt/rideops/certs
  cp -fL /etc/letsencrypt/live/rideops.it/fullchain.pem /opt/rideops/certs/
  cp -fL /etc/letsencrypt/live/rideops.it/privkey.pem   /opt/rideops/certs/
  chmod 644 /opt/rideops/certs/fullchain.pem
  chmod 600 /opt/rideops/certs/privkey.pem
"
./scripts/rideops.sh restart nginx
```

> Il flag `-L` è obbligatorio: i file in `/etc/letsencrypt/live/` sono symlink.

**Errore di configurazione (`nginx: configuration file test failed`):**
```bash
ssh root@91.98.196.151 "docker exec rideops-nginx nginx -t"
# Correggi la configurazione in nginx/conf.d/rideops.conf
./scripts/rideops.sh sync-config
./scripts/rideops.sh restart nginx
```

---

### Caso B: Certificato SSL scaduto

**Sintomi:** browser mostra `ERR_CERT_DATE_INVALID` o lucchetto rosso.

```bash
# Verifica scadenza
ssh root@91.98.196.151 "certbot certificates"

# Rinnovo manuale
ssh root@91.98.196.151 "certbot renew --force-renewal"

# Il deploy-hook copia automaticamente i nuovi cert e ricarica nginx.
# Se non funziona, esegui manualmente:
ssh root@91.98.196.151 "bash /opt/rideops/scripts/copy_ssl_and_reload_nginx.sh"
```

---

### Caso C: Frontend down (`502 Bad Gateway`)

Il browser carica la pagina ma riceve `502`: nginx non riesce a raggiungere il frontend.

```bash
./scripts/rideops.sh logs frontend 50

# Riavvia il frontend
./scripts/rideops.sh restart frontend

# Se non riparte, forza il recreate
ssh root@91.98.196.151 "cd /opt/rideops && \
  docker compose -f docker-compose.prod.yml --env-file .env \
  up -d --no-deps --force-recreate frontend"
```

---

### Caso D: Backend down (`503` sulle chiamate API)

Il sito si carica ma le funzioni non funzionano (login, dati, ecc.).

```bash
./scripts/rideops.sh logs backend 100

# Verifica il health endpoint
ssh root@91.98.196.151 \
  "curl -s http://localhost:8080/actuator/health | python3 -m json.tool"

# Riavvia il backend
./scripts/rideops.sh restart backend
```

---

### Caso E: DNS non propagato o record A errato

**Sintomi:** `curl https://rideops.it` → timeout, ma `curl https://91.98.196.151` funziona.

```bash
# Verifica DNS attuale
nslookup rideops.it 8.8.8.8
dig rideops.it +short

# Deve restituire: 91.98.196.151
# Se diverso: aggiorna il record A nel pannello del registrar del dominio.
# Propagazione DNS: 5 min – 48 ore
```

---

### Caso F: Disco pieno

**Sintomi:** container si fermano all'improvviso, log di errori di scrittura.

```bash
./scripts/rideops.sh health
# Guarda la sezione "Disco"

ssh root@91.98.196.151 "df -h /"
# Se > 90% occupato:

# Rimuovi immagini Docker non usate (libera istantaneamente 500MB–2GB)
ssh root@91.98.196.151 "docker image prune -f"

# Rimuovi backup più vecchi di 3 giorni (emergenza)
ssh root@91.98.196.151 "find /opt/rideops/backups -name '*.sql.gz' -mtime +3 -delete"

# Verifica spazio liberato
ssh root@91.98.196.151 "df -h /"
```

---

## Checklist post-recovery

Dopo qualsiasi intervento di recovery, verifica:

- [ ] `./scripts/rideops.sh ps` → tutti i container `Up (healthy)`
- [ ] `curl -I https://rideops.it/` → `HTTP/2 200`
- [ ] Login sul sito funzionante
- [ ] `./scripts/rideops.sh logs backend 20` → nessun errore
- [ ] `./scripts/rideops.sh logs nginx 20` → nessun errore
- [ ] Cron backup attivo: `ssh root@91.98.196.151 "crontab -l"`
- [ ] Certificato SSL valido: `ssh root@91.98.196.151 "certbot certificates"`
- [ ] Esegui un backup manuale di verifica: `./scripts/rideops.sh db:backup`

---

## Riferimenti rapidi

| Risorsa | Dove |
|--------|------|
| Hetzner Cloud Console | https://console.hetzner.cloud |
| GitHub Actions (pipeline) | https://github.com/lucioaleotta/RideOps/actions |
| GitHub Secrets | https://github.com/lucioaleotta/RideOps/settings/secrets/actions |
| Registrar DNS | pannello del registrar di `rideops.it` |
| Backup sul server | `/opt/rideops/backups/` |
| Log backup | `/opt/rideops/logs/backup.log` |
| Script install | `scripts/server/install.sh` |
| Script restore | `scripts/server/restore.sh` |
