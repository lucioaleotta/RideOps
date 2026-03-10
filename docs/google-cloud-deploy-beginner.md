# RideOps su Google Cloud - Guida Semplice (Principiante)

Questa guida ti porta da zero a RideOps online su Google Cloud.

Stack consigliato:
- Frontend: Cloud Run
- Backend: Cloud Run
- Database: Cloud SQL (PostgreSQL)
- Immagini Docker: Artifact Registry
- Segreti: Secret Manager

## 0. Cosa ti serve prima

- Un account Google Cloud con billing attivo
- `gcloud` installato
- Docker installato
- Accesso al repository RideOps

Controllo rapido:

```bash
gcloud --version
docker --version
```

## 1. Configurazione base progetto

Sostituisci `YOUR_PROJECT_ID` con il tuo progetto.

```bash
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="europe-west1"
export REPO="rideops"
export BACKEND_SERVICE="rideops-backend"
export FRONTEND_SERVICE="rideops-frontend"
export DB_INSTANCE="rideops-postgres"
export DB_NAME="rideops"
export DB_USER="rideops"
```

Login e progetto attivo:

```bash
gcloud auth login
gcloud config set project "$PROJECT_ID"
```

Abilita API necessarie:

```bash
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

## 2. Artifact Registry (repository immagini Docker)

```bash
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="RideOps Docker images"
```

## 3. Cloud SQL PostgreSQL

Crea istanza:

```bash
gcloud sql instances create "$DB_INSTANCE" \
  --database-version=POSTGRES_16 \
  --cpu=1 \
  --memory=3840MiB \
  --region="$REGION"
```

Crea database e utente:

```bash
gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE"
gcloud sql users create "$DB_USER" \
  --instance="$DB_INSTANCE" \
  --password="CHANGEME_STRONG_DB_PASSWORD"
```

Prendi IP pubblico del DB:

```bash
export DB_HOST="$(gcloud sql instances describe "$DB_INSTANCE" --format='value(ipAddresses[0].ipAddress)')"
echo "$DB_HOST"
```

## 4. Secret Manager

Crea segreti per JWT e password DB:

```bash
printf '%s' 'CHANGEME_JWT_SECRET_2026' | gcloud secrets create rideops-jwt-secret --data-file=-
printf '%s' 'CHANGEME_STRONG_DB_PASSWORD' | gcloud secrets create rideops-db-password --data-file=-
```

## 5. Build immagini backend/frontend

Dalla root del repo:

```bash
cd /path/to/RideOps
```

Build backend:

```bash
gcloud builds submit ./backend \
  --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest"
```

Build frontend:

```bash
gcloud builds submit ./frontend \
  --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:latest"
```

## 6. Deploy backend su Cloud Run

```bash
gcloud run deploy "$BACKEND_SERVICE" \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "DB_HOST=$DB_HOST,DB_PORT=5432,DB_NAME=$DB_NAME,DB_USER=$DB_USER,SERVER_PORT=8080,SPRING_PROFILES_ACTIVE=prod" \
  --set-secrets "DB_PASSWORD=rideops-db-password:latest,JWT_SECRET=rideops-jwt-secret:latest"
```

Salva URL backend:

```bash
export BACKEND_URL="$(gcloud run services describe "$BACKEND_SERVICE" --region "$REGION" --format='value(status.url)')"
echo "$BACKEND_URL"
```

## 7. Deploy frontend su Cloud Run

```bash
gcloud run deploy "$FRONTEND_SERVICE" \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:latest" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars "BACKEND_URL=$BACKEND_URL,FRONTEND_ENV=prod"
```

URL frontend:

```bash
gcloud run services describe "$FRONTEND_SERVICE" --region "$REGION" --format='value(status.url)'
```

## 8. Caricare dati demo (opzionale ma consigliato)

Per avere subito dashboard popolate:

```bash
gcloud sql connect "$DB_INSTANCE" --user="$DB_USER" --database="$DB_NAME"
```

Dentro `psql`:

```sql
\i /path/to/RideOps/backend/script/seed_demo_data.sql
```

## 9. Test finale rapido

- Apri frontend URL
- Login admin default: `admin` / `ChangeMe123!` (se non cambiata)
- Verifica pagina finance e gestione personale

Health backend:

```bash
curl -s "$BACKEND_URL/actuator/health"
```

## 10. Aggiornamenti futuri (nuova release)

Ogni volta che cambi codice:

```bash
# build nuove immagini
gcloud builds submit ./backend --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest"
gcloud builds submit ./frontend --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:latest"

# redeploy
gcloud run deploy "$BACKEND_SERVICE" --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest" --region "$REGION"
gcloud run deploy "$FRONTEND_SERVICE" --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:latest" --region "$REGION"
```

---

# Produzione sicura (step successivo consigliato)

Quando il progetto passa a uso reale, applica questi miglioramenti:

1. Rendi il backend non pubblico:
```bash
gcloud run services update "$BACKEND_SERVICE" --region "$REGION" --no-allow-unauthenticated
```

2. Usa Cloud SQL connector privato (no IP pubblico DB).

3. Metti tutte le credenziali in Secret Manager (anche admin password).

4. Configura dominio custom e HTTPS gestito.

5. Aggiungi CI/CD con Cloud Build Trigger da GitHub.

6. Imposta monitoraggio e alerting (Cloud Monitoring + Error Reporting).

## Checklist pronta all'uso

- [ ] Progetto GCP creato e billing attivo
- [ ] API abilitate
- [ ] Artifact Registry creato
- [ ] Cloud SQL creato
- [ ] Secrets creati
- [ ] Backend deployato
- [ ] Frontend deployato
- [ ] Seed dati eseguito
- [ ] Login verificato
- [ ] Health backend verificato

Se un comando fallisce, copia errore completo e riparti dallo step corrente senza rifare tutto da capo.
