# RideOps – Guida operativa

Questa guida raccoglie tutti i comandi utili per monitorare, gestire e manutenere il server di produzione RideOps su Hetzner.

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
| `./scripts/rideops.sh db:backup` | Backup manuale |
| `./scripts/rideops.sh cron:backup` | Installa cron backup notturno |
| `./scripts/rideops.sh ssl` | Ottieni certificato SSL (dopo DNS) |
| `./scripts/rideops.sh shell` | Shell bash remota |

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
bash /opt/rideops/scripts/server/backup.sh
# I backup vengono salvati in /opt/rideops/backups/
ls -lh /opt/rideops/backups/
```

### Restore da backup

```bash
# Sostituisci il nome file con quello che vuoi ripristinare
gunzip -c /opt/rideops/backups/rideops_YYYYMMDD_HHMMSS.sql.gz \
  | docker exec -i rideops-postgres psql -U rideops -d rideops
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
│   ├── backup.sh               # Backup pg_dump
│   ├── obtain-cert.sh          # Certbot
│   └── pull-and-restart.sh     # Deploy
├── backups/                    # Backup database
├── logs/                       # Log cron e script
└── src/                        # Repo clonato da GitHub
```

---

## Checklist pendenti

- [ ] Propagazione DNS `rideops.it` → SSL con `./scripts/rideops.sh ssl`
- [ ] Cron backup notturno → `./scripts/rideops.sh cron:backup`
- [ ] GitHub Actions secrets: `HETZNER_HOST`, `HETZNER_SSH_KEY`
- [ ] Disabilitare/eliminare vecchi workflow GCP (`.github/workflows/backend-cd.yml`, `frontend-cd.yml`)
