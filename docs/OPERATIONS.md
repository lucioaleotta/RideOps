# RideOps – Guida operativa

Questa guida raccoglie tutti i comandi utili per monitorare, gestire e manutenere il server di produzione RideOps su Hetzner.

> In caso di emergenza, consulta direttamente [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md).

---

## Accesso rapido

### SSH diretto

```bash
ssh -i ~/.ssh/id_rsa root@91.98.196.151
```

### Shortcut (aggiungere a `~/.ssh/config`)

```
Host rideops
    HostName 91.98.196.151
    User root
    IdentityFile ~/.ssh/id_rsa
```

Dopo averlo aggiunto: `ssh rideops`

---

## CLI semplificata

Lo script `scripts/rideops.sh` racchiude tutti i comandi frequenti.  
Si esegue **in locale** e si connette via SSH al server.

```bash
# Rendi eseguibile (una volta sola)
chmod +x scripts/rideops.sh

# Aiuto
./scripts/rideops.sh help
```

| Comando | Descrizione |
|--------|-------------|
| `./scripts/rideops.sh ps` | Stato container |
| `./scripts/rideops.sh logs backend` | Log del backend (follow) |
| `./scripts/rideops.sh logs backend 500` | Ultime 500 righe del backend |
| `./scripts/rideops.sh restart nginx` | Riavvia nginx |
| `./scripts/rideops.sh restart` | Riavvia tutti i servizi |
| `./scripts/rideops.sh stop postgres` | Ferma postgres |
| `./scripts/rideops.sh stop` | Ferma tutto lo stack |
| `./scripts/rideops.sh start` | Avvia/ripristina lo stack |
| `./scripts/rideops.sh deploy` | git pull + rebuild + riavvio |
| `./scripts/rideops.sh health` | Health check completo |
| `./scripts/rideops.sh db` | Shell psql interattiva |
| `./scripts/rideops.sh db:query "SELECT ..."` | Query SQL rapida |
| `./scripts/rideops.sh db:backup` | Backup manuale del database |
| `./scripts/rideops.sh db:restore` | Ripristino interattivo da backup (lista backup sul server) |
| `./scripts/rideops.sh db:restore /path/file.sql.gz` | Ripristino da file locale (lo carica sul server) |
| `./scripts/rideops.sh cron:backup` | Installa cron backup notturno (02:00) |
| `./scripts/rideops.sh ssl` | Ottieni certificato SSL (dopo DNS) |
| `./scripts/rideops.sh sync-config` | Sincronizza nginx config dal repo al server |
| `./scripts/rideops.sh shell` | Shell bash remota |
| **`./scripts/rideops.sh dr:check`** | **Diagnostica automatica: server, container, DB, HTTPS, disco** |
| **`./scripts/rideops.sh dr:rebuild <IP>`** | **Rebuild completo stack su un nuovo server Hetzner** |

---

## Comandi Docker manuali (sul server)

Dopo aver fatto SSH sul server:

### Stato container

```bash
# Stato riassuntivo
docker ps

# Formato tabella leggibile
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# Mostra anche i container fermi
docker ps -a
```

### Log

```bash
# Log in tempo reale di un servizio (Ctrl+C per uscire)
docker logs -f rideops-backend
docker logs -f rideops-frontend
docker logs -f rideops-nginx
docker logs -f rideops-postgres

# Ultime N righe
docker logs --tail=200 rideops-backend

# Log con timestamp
docker logs --timestamps rideops-backend
```

### Avvio / stop / riavvio

```bash
cd /opt/rideops

# Riavvio singolo container
docker restart rideops-backend
docker restart rideops-nginx

# Riavvio tramite Compose (rispetta le dipendenze)
docker compose -f docker-compose.prod.yml --env-file .env restart

# Stop singolo
docker stop rideops-nginx

# Avvia lo stack completo
docker compose -f docker-compose.prod.yml --env-file .env up -d

# Stop stack completo (i dati restano nel volume)
docker compose -f docker-compose.prod.yml --env-file .env down

# Stop + rimozione volumi (⚠️ ELIMINA IL DATABASE)
docker compose -f docker-compose.prod.yml --env-file .env down -v
```

### Rebuild di un singolo servizio

```bash
cd /opt/rideops/src

# Rebuild e riavvio solo del backend
docker build -t rideops-backend:latest ./backend
docker compose -f /opt/rideops/docker-compose.prod.yml --env-file /opt/rideops/.env \
  up -d --no-deps backend

# Rebuild e riavvio solo del frontend
docker build -t rideops-frontend:latest ./frontend
docker compose -f /opt/rideops/docker-compose.prod.yml --env-file /opt/rideops/.env \
  up -d --no-deps frontend
```

---

## Database PostgreSQL

### Shell psql interattiva

```bash
docker exec -it rideops-postgres psql -U rideops -d rideops
```

Comandi utili dentro psql:

```sql
\dt                          -- lista tabelle
\d nome_tabella              -- struttura tabella
SELECT * FROM users LIMIT 20;
SELECT count(*) FROM services;
\q                           -- esci
```

### Query da fuori psql

```bash
docker exec rideops-postgres psql -U rideops -d rideops -c "SELECT id, email FROM users;"
```

### Backup manuale

```bash
# Tramite CLI locale (raccomandato)
./scripts/rideops.sh db:backup

# Oppure direttamente sul server
bash /opt/rideops/scripts/server/backup.sh
```

I backup vengono salvati in `/opt/rideops/backups/rideops_YYYYMMDD_HHMMSS.sql.gz`, con retention di **7 giorni**.  
Il cron automatico gira ogni notte alle **02:00** (configurato con `./scripts/rideops.sh cron:backup`).

### Restore da backup

**Metodo 1 – Interattivo (raccomandato)**

Mostra la lista dei backup disponibili sul server e guida passo passo:

```bash
./scripts/rideops.sh db:restore
```

Lo script:
1. Elenca i backup disponibili con dimensione e data
2. Chiede quale numero ripristinare
3. Richiede conferma esplicita prima di sovrascrivere
4. Termina le connessioni attive al DB
5. Esegue il ripristino e mostra una verifica delle tabelle

**Metodo 2 – Da file locale**

Se hai scaricato un backup in locale (es. per ripristino cross-ambiente):

```bash
./scripts/rideops.sh db:restore /path/to/rideops_20260415_020000.sql.gz
```

Lo script carica il file sul server, lo ripristina e poi lo cancella.

**Metodo manuale (solo emergenza)**

```bash
# SSH sul server + ripristino diretto
ssh root@91.98.196.151
bash /opt/rideops/scripts/server/restore.sh

# Oppure passando il file direttamente
bash /opt/rideops/scripts/server/restore.sh /opt/rideops/backups/rideops_YYYYMMDD_HHMMSS.sql.gz
```

---

## Monitoraggio risorse

```bash
# Utilizzo CPU/RAM dei container (aggiornamento in tempo reale)
docker stats

# Snapshot una-tantum
docker stats --no-stream

# Spazio disco
df -h /

# Spazio usato dai volumi Docker
docker system df

# Memoria del sistema
free -h
```

---

## Nginx

```bash
# Test configurazione
docker exec rideops-nginx nginx -t

# Reload config (senza downtime)
docker exec rideops-nginx nginx -s reload

# Test HTTP
curl -I http://localhost/

# Test HTTPS (dopo SSL)
curl -I https://rideops.it/
```

---

## SSL – Let's Encrypt

> Eseguire solo dopo che DNS `rideops.it` → `91.98.196.151` è propagato.

```bash
# Verifica DNS
nslookup rideops.it 8.8.8.8

# Oppure tramite CLI locale:
./scripts/rideops.sh ssl
```

**Passi manuali sul server:**

```bash
bash /opt/rideops/scripts/server/obtain-cert.sh

# Attiva config HTTPS
cd /opt/rideops/nginx/conf.d
mv rideops.conf.ssl-disabled rideops.conf
rm rideops-http.conf

# Decommenta i volumi SSL in docker-compose.prod.yml
# Quindi riavvia nginx
docker compose -f /opt/rideops/docker-compose.prod.yml --env-file /opt/rideops/.env \
  up -d nginx
```

---

## Deploy aggiornamenti da GitHub

```bash
# Sul server
cd /opt/rideops/src
git pull origin main
docker build -t rideops-backend:latest ./backend
docker build -t rideops-frontend:latest ./frontend
docker compose -f /opt/rideops/docker-compose.prod.yml --env-file /opt/rideops/.env \
  up -d --no-deps backend frontend nginx
docker image prune -f
```

Oppure in un colpo solo da locale:

```bash
./scripts/rideops.sh deploy
```

---

## Cron jobs

```bash
# Installa cron backup notturno (02:00)
./scripts/rideops.sh cron:backup

# Verifica cron installato
ssh -i ~/.ssh/id_rsa root@91.98.196.151 "crontab -l"

# Log backup
ssh -i ~/.ssh/id_rsa root@91.98.196.151 "tail -50 /opt/rideops/logs/backup.log"
```

---

## Pulizia Docker

```bash
# Rimuovi immagini non usate
docker image prune -f

# Pulizia completa (immagini/container/network/cache non in uso)
docker system prune -f

# ⚠️  Pulizia TOTALE inclusi i volumi (ELIMINA DATABASE)
docker system prune -f --volumes
```

---

## Struttura directory sul server

```
/opt/rideops/
├── .env                        # Secrets di produzione (chmod 600)
├── docker-compose.prod.yml     # Stack definition
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
│       ├── rideops.conf        # Config HTTPS (attiva dopo SSL)
│       └── rideops-http.conf   # Config HTTP temporanea
├── scripts/server/
│   ├── backup.sh               # Backup pg_dump (cron 02:00)
│   ├── restore.sh              # Ripristino interattivo da backup
│   ├── obtain-cert.sh          # Certbot
│   └── pull-and-restart.sh     # Deploy (chiamato dalla pipeline CI/CD)
├── backups/                    # Backup database
├── logs/                       # Log cron e script
└── src/                        # Repo clonato da GitHub
```

---

## Logging strutturato

In produzione (Spring profile `prod`) il backend emette log in formato **JSON strutturato** (logstash-logback-encoder), un log per riga.

Ogni riga contiene:

| Campo | Descrizione |
|-------|-------------|
| `@timestamp` | Timestamp UTC ISO-8601 |
| `level` | `INFO`, `WARN`, `ERROR` |
| `logger_name` | Classe Java che ha emesso il log |
| `message` | Testo del log |
| `traceId` | UUID univoco per richiesta HTTP (da MDC) |

Ogni richiesta HTTP viene loggata automaticamente da `RequestLoggingFilter` con `method`, `path`, `status`, `durationMs`, `outcome`. Le path `/actuator/**` sono escluse.

### Consultare i log

```bash
# Log in tempo reale (JSON grezzo)
docker logs -f rideops-backend

# Log leggibili (pretty-print, richiede jq)
docker logs --tail=100 rideops-backend | jq .

# Filtra solo errori
docker logs --tail=500 rideops-backend | jq 'select(.level=="ERROR")'

# Traccia una richiesta specifica
docker logs --tail=1000 rideops-backend | jq 'select(.traceId=="<UUID>")'

# Via CLI locale
./scripts/rideops.sh logs backend
./scripts/rideops.sh logs backend 500
```

### PCI DSS / Privacy

Tutti i dati sensibili sono mascherati da `LogSanitizer` prima di essere scritti:
- Numeri carta → `****-****-****-1234`
- IBAN → `****1234`
- Password/token/secret → `[REDACTED]`
- Email → `m***@dominio.com`
- Telefono → `****567`

---

## Policy di rotazione log

### Docker log rotation (tutti i container)

Configura in `docker-compose.prod.yml` tramite il driver `json-file`:

| Container | max-size | max-file | Spazio massimo |
|-----------|----------|----------|----------------|
| `backend` | 50 MB | 10 | ~500 MB |
| `nginx` | 20 MB | 5 | ~100 MB |
| `frontend` | 20 MB | 5 | ~100 MB |
| `postgres` | 10 MB | 5 | ~50 MB |

Docker rimuove automaticamente il file più vecchio quando il limite viene raggiunto. Nessuna configurazione manuale necessaria.

### Logrotate host (Ubuntu 22.04)

Installato da `scripts/server/install.sh` in due file:

**`/etc/logrotate.d/rideops-nginx`**
- Rotazione: **giornaliera**
- Retention: **14 giorni**
- Compressione: sì (`compress` + `delaycompress`)
- Post-rotate: `docker exec rideops-nginx nginx -s reopen`

**`/etc/logrotate.d/rideops-docker`**
- Rotazione: **giornaliera**
- Retention: **7 giorni**
- Compressione: sì
- Metodo: `copytruncate` (non interrompe il processo Docker)

```bash
# Verifica configurazione logrotate
cat /etc/logrotate.d/rideops-nginx
cat /etc/logrotate.d/rideops-docker

# Test dry-run (non esegue realmente)
logrotate -d /etc/logrotate.d/rideops-nginx

# Forza rotazione manuale
logrotate -f /etc/logrotate.d/rideops-nginx
```

---

## Checklist infrastruttura

- [x] SSL Let's Encrypt attivo su `rideops.it` (certbot + deploy hook)
- [x] Cron backup notturno alle 02:00 configurato sul server
- [x] GitHub Actions secrets configurati: `HETZNER_HOST`, `HETZNER_SSH_KEY`, `GHCR_TOKEN`
- [x] Script `restore.sh` disponibile in `/opt/rideops/scripts/server/restore.sh`
- [x] Pipeline `deploy-hetzner.yml` operativa (scp-action + ssh-action)
- [x] Workflow GCP obsoleti rimossi (`backend-cd.yml`, `frontend-cd.yml`)
- [x] `dr:check` e `dr:rebuild` disponibili nella CLI per disaster recovery automatizzato
- [x] Logging strutturato JSON attivo in prod (`logstash-logback-encoder`, `logback-spring.xml`)
- [x] Log rotation Docker configurata (`json-file` driver, limiti per container in `docker-compose.prod.yml`)
- [x] Logrotate host configurato (`/etc/logrotate.d/rideops-nginx`, `/etc/logrotate.d/rideops-docker`)

---

## Disaster Recovery (emergenza)

In caso di emergenza usa la diagnostica automatica prima di intervenire manualmente:

```bash
# Diagnostica completa in un colpo solo
./scripts/rideops.sh dr:check
```

Controlla automaticamente: ping server → stato container → postgres healthy → HTTPS → spazio disco.  
Per ogni problema trovato stampa il comando correttivo esatto.

**Se il server è irrecuperabile** (distrutto/irraggiungibile da Hetzner Console):

```bash
# Dopo aver creato un nuovo server CX23 su Hetzner:
./scripts/rideops.sh dr:rebuild <NUOVO_IP>
```

Esegue in automatico: install.sh, struttura directory, copia config, avvio stack, ripristino DB da backup, cron backup.  
Step rimasti manuali: aggiornare DNS + GitHub Secret `HETZNER_HOST`.

> Guida completa: [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md)
