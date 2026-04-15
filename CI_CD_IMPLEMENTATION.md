# CI/CD Implementation

Implementazione CI/CD con GitHub Actions + Hetzner VPS + GHCR.

## ✅ Architettura attuale

### Workflow GitHub Actions

| File | Trigger | Azione |
|------|---------|--------|
| `.github/workflows/deploy-hetzner.yml` | Push/merge su `main` + `workflow_dispatch` | Test → Build → Push GHCR → Deploy VPS |

### Pipeline Steps (deploy-hetzner.yml)

```
push a main
    │
    ├─ [1] test-backend
    │       └─ mvn -q test -B (Java 21, Temurin)
    │
    ├─ [2] build-and-push  (needs: test-backend)
    │       ├─ docker/setup-buildx-action
    │       ├─ docker/login-action → ghcr.io
    │       ├─ build + push rideops-backend:{sha} + :latest
    │       └─ build + push rideops-frontend:{sha} + :latest
    │
    └─ [3] deploy  (needs: build-and-push, environment: production)
            ├─ actions/checkout
            ├─ appleboy/scp-action → /opt/rideops/ (scripts + config)
            ├─ appleboy/ssh-action → pull-and-restart.sh {sha}
            │       ├─ docker login ghcr.io  (GHCR_TOKEN + GHCR_USER via envs)
            │       ├─ docker compose pull backend frontend
            │       ├─ cp -fL certs da /etc/letsencrypt/live/rideops.it/
            │       ├─ docker compose up -d --no-deps postgres (+ health wait)
            │       └─ docker compose up -d --no-deps backend frontend nginx
            └─ health check (6× curl https://rideops.it)
```

---

## 🔑 Secrets GitHub richiesti

Vai a: Repository → Settings → Secrets and variables → **Secrets**

| Secret | Valore |
|--------|--------|
| `HETZNER_HOST` | `91.98.196.151` |
| `HETZNER_SSH_KEY` | Chiave SSH privata (root del VPS) |

> `GITHUB_TOKEN` è automatico — usato come `GHCR_TOKEN` per il login al registry.

---

## 📁 File di configurazione sincronizzati ad ogni deploy

La pipeline copia automaticamente sul server i seguenti file prima di eseguire il deploy:

| File locale | Destinazione server |
|-------------|---------------------|
| `scripts/server/pull-and-restart.sh` | `/opt/rideops/scripts/server/` |
| `scripts/copy_ssl_and_reload_nginx.sh` | `/opt/rideops/scripts/` |
| `nginx/conf.d/rideops.conf` | `/opt/rideops/nginx/conf.d/` |
| `nginx/nginx.conf` | `/opt/rideops/nginx/` |
| `docker-compose.prod.yml` | `/opt/rideops/` |

---

## 🔒 SSL / Certificati

- Certificati Let's Encrypt in `/etc/letsencrypt/live/rideops.it/`
- Copiati in `/opt/rideops/certs/` ad ogni deploy (tramite `pull-and-restart.sh`)
- Montati in nginx come `/etc/nginx/certs/` (volume read-only)
- **Rinnovo automatico** via certbot deploy-hook: `/etc/letsencrypt/renewal-hooks/deploy/rideops.sh`

---

## 🛠️ Operazioni manuali sul server

### Riavvio nginx (e.g. dopo modifica config)
```bash
ssh root@91.98.196.151 "cd /opt/rideops && docker compose -f docker-compose.prod.yml --env-file .env restart nginx"
```

### Rinnovo manuale certificati
```bash
ssh root@91.98.196.151 "certbot renew --dry-run"
```

### Verifica stato container
```bash
ssh root@91.98.196.151 "docker ps -a --format 'table {{.Names}}\t{{.Status}}'"
```

### Log nginx
```bash
ssh root@91.98.196.151 "docker logs rideops-nginx --tail 50"
```

### Log backend
```bash
ssh root@91.98.196.151 "docker logs rideops-backend --tail 100"
```

---

## 📊 Architettura pipeline

```
GitHub (main branch)
    │
    ├─ [PR aperta]
    │      └─ test-backend (mvn test)
    │
    └─ [Merge a main / workflow_dispatch]
           └─ GitHub Actions (deploy-hetzner.yml)
                  ├─ test backend ✅
                  ├─ build + push images → GHCR ✅
                  ├─ scp scripts/config → Hetzner ✅
                  ├─ ssh: pull-and-restart.sh ✅
                  └─ health check https://rideops.it ✅

GHCR (ghcr.io/lucioaleotta/)
    ├─ rideops-backend:{sha} + :latest
    └─ rideops-frontend:{sha} + :latest

Hetzner VPS (91.98.196.151)
    └─ Docker Compose (prod)
           ├─ nginx:1.27-alpine      ← :80/:443
           ├─ rideops-frontend:latest ← :3000 (interno)
           ├─ rideops-backend:latest  ← :8080 (interno)
           └─ postgres:16-alpine      ← :5432 (interno)
```

## ✅ Cosa è stato fatto

### 1. Workflow GitHub Actions

| File | Trigger | Azione |
|------|---------|--------|
| `.github/workflows/backend-ci.yml` | Push/PR su `backend/` | Test Maven (già esistente) |
| `.github/workflows/backend-cd.yml` | Merge a main / Manual | Build + Docker + deploy Backend Cloud Run |
| `.github/workflows/frontend-cd.yml` | Merge a main / Manual | Build + Docker + deploy Frontend Cloud Run |
| `.github/workflows/docs-ci.yml` | PR su docs/ | Validate markdown + check links |

### 2. Documentazione Setup

| File | Scopo |
|------|-------|
| `docs/GITHUB_OIDC_SETUP.md` | Step-by-step OIDC Federation setup in GCP |
| `docs/GITHUB_ACTIONS_SETUP.md` | Configurare secrets/variables in GitHub |

### 3. Features Implementate

✅ **OIDC Authentication** (zero secrets in GitHub!)  
✅ **Auto-Deploy su merge a main** → produzione  
✅ **Manual Deploy via Workflow Dispatch** → staging o produzione  
✅ **Ambienti separati** (staging + produzione su Cloud Run distinti)  
✅ **Secret Manager** (DB_PASSWORD e JWT_SECRET da Secret Manager, non in chiaro)  
✅ **Slack Notifications** (su success/failure)  
✅ **Docker Tagging** (con commit SHA)  
✅ **Smoke Tests** (health check con retry 5×10s dopo deploy)  
✅ **Workspace Setup** (ambiente isolato per ogni job)  

---

## 🔧 Prossimi Step (IN ORDINE)

### Step 1️⃣: Setup OIDC Workload Identity in GCP

**File:** `docs/GITHUB_OIDC_SETUP.md`

Esegui i comandi in sequenza:

```bash
# Prerequisiti
export PROJECT_ID="rideops-489909"
gcloud config set project $PROJECT_ID

# Step 1-2: Abilita API + Crea pool
gcloud services enable iamcredentials.googleapis.com cloudresourcemanager.googleapis.com sts.googleapis.com

gcloud iam workload-identity-pools create "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions"

export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
echo "PROJECT_NUMBER=$PROJECT_NUMBER"

# Step 3: Crea provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.environment=assertion.environment" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-condition="assertion.aud=='lucioaleotta/RideOps' || assertion.aud=='rideops-489909'"

# Step 4: Crea service account + assegna ruoli
gcloud iam service-accounts create github-actions \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions CI/CD"

export SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Assegna ruoli
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudbuild.builds.editor"

# Step 5: Crea binding
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/lucioaleotta/RideOps"
```

**Tempo stimato:** 5-10 minuti

---

### Step 2️⃣: Aggiungere Secrets in GitHub

**Vai a:** Repository → Settings → Secrets and variables → **Secrets**

Crea questi secrets con i valori:

```
ADMIN_PASSWORD
  Valore: password admin bootstrap per produzione

SLACK_WEBHOOK (opzionale)
  Valore: La tua webhook Slack
  Dove trovarla: https://api.slack.com/messaging/webhooks
```

**Tempo:** 2-3 minuti

---

### Step 3️⃣: Aggiungere Variables in GitHub

**Vai a:** Repository → Settings → Secrets and variables → **Variables**

Crea queste variabili:

```
WIF_PROVIDER
  projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider
  
  (Sostituisci PROJECT_NUMBER con il valore trovato in Step 1)
  Esempio: projects/123456789/locations/global/workloadIdentityPools/github/providers/github-provider

WIF_SERVICE_ACCOUNT
  github-actions@rideops-489909.iam.gserviceaccount.com

PROJECT_ID
  rideops-489909

GCP_REGION
  europe-west1

BACKEND_SERVICE
  rideops-backend

BACKEND_SERVICE_STAGING (opzionale)
  rideops-backend-staging

FRONTEND_SERVICE
  rideops-frontend

ARTIFACT_REGISTRY_REPO
  europe-west1-docker.pkg.dev/rideops-489909/rideops

DB_HOST
  Host PostgreSQL (IP Cloud SQL o hostname privato)

DB_PORT
  5432

DB_NAME
  rideops

DB_USER
  rideops

DB_PASSWORD_SECRET_REF
  rideops-db-password:latest

JWT_SECRET_REF
  rideops-jwt-secret:latest
```

**Tempo:** 2-3 minuti

---

### Step 4️⃣: Verificare i Workflow su GitHub

**Vai a:** Repository → **Actions** tab

Dovresti vedere:
- ✅ Backend CI (già esistente)
- ✅ Backend CI/CD (nuovo)
- ✅ Frontend CI/CD (nuovo)
- ✅ Docs CI (nuovo)

Se NON vedi i nuovi workflow:
```bash
# Pull il commit main locale
git checkout main
git pull origin main

# Verifica i file
ls -la .github/workflows/
```

**Tempo:** 1 minuto

---

### Step 5️⃣: Test del CI/CD con PR

**Crea una pull request test:**

```bash
git checkout -b feature/test-ci
echo "# Test CI/CD" >> README.md
git add README.md
git commit -m "test: trigger CI/CD workflows"
git push -u origin feature/test-ci
```

Apri PR su GitHub e controlla:
- ✅ Backend CI eseguito? ✅ Frontend build eseguito? ✅ Docs validation eseguito?

Se OK, chiudi la PR senza merge.

**Tempo:** 3-5 minuti

---

### Step 6️⃣: Test del Deploy Automatico

**Effettua un merge reale a main:**

```bash
# Su GitHub UI:
# 1. Apri una vera PR (es. feature/small-fix)
# 2. Attendi che i test passino
# 3. Clicca "Squash and merge"
```

Controlla il deploy:
- ✅ Vai a **Actions** → Backend CI/CD / Frontend CI/CD
- ✅ Aspetta che i job terminino
- ✅ Verifica i log per errori
- ✅ Testa gli endpoint in produzione:
  ```bash
  curl https://rideops-backend-fgnnhhq3va-ew.a.run.app/actuator/health
  curl https://rideops-frontend-9867177203.europe-west1.run.app/login
  ```

**Tempo:** 5-10 minuti

---

### Step 7️⃣: Configurare Slack Notifications (opzionale)

Se vuoi notifiche su Slack:

1. Vai a: https://api.slack.com/apps
2. Crea una **New App**
3. Seleziona **From scratch**
4. Nome: "RideOps CI/CD", Workspace: il tuo workspace Slack
5. In sidebar: **Incoming Webhooks** → Attiva
6. **Add New Webhook to Workspace** → Seleziona canale (es. #deployments)
7. Copia l'URL webhook
8. Aggiungi su GitHub come secret `SLACK_WEBHOOK`

**Tempo:** 5 minuti

---

## 📊 Architettura Finale

```
feature branch
    │
    ├─ [PR aperta]
    │      ├─ Backend CI (mvn verify)
    │      ├─ Frontend CI (build + lint)
    │      └─ Docs CI (validate)
    │
    ├─ [workflow_dispatch → staging]
    │      └─ deploy su rideops-backend-staging
    │             └─ smoke test /actuator/health ✅
    │
    └─ [Merge a main]
           └─ GitHub Actions (CD)
                  ├─ Backend: build → push image → deploy rideops-backend (prod)
                  ├─ Frontend: build → push image → deploy rideops-frontend (prod)
                  └─ Slack notification: ✅/❌

Cloud Run (europe-west1)
    ├─ rideops-backend          ← produzione  (Spring profile: prod)
    └─ rideops-backend-staging  ← staging     (Spring profile: staging)

Secret Manager
    ├─ rideops-db-password   → DB_PASSWORD  (entrambi gli ambienti)
    └─ rideops-jwt-secret    → JWT_SECRET   (entrambi gli ambienti)
```

---

## 🎯 Trigger Events

| Event | Workflow | Azione |
|-------|----------|--------|
| **Push a main** | Backend CI/CD, Frontend CI/CD | Auto-deploy (se altro non interrompe) |
| **PR to main** | Backend CI, Frontend CI, Docs CI | Test only (no deploy) |
| **Workflow Dispatch** | Backend CI/CD, Frontend CI/CD | Manual deploy on-demand |
| **Push a backend/** | Backend CI | Test (PR) / Deploy (main) |
| **Push a frontend/** | Frontend CI/CD | Test (PR) / Deploy (main) |
| **Push a docs/** | Docs CI | Validation (PR) |

---

## 🆘 Troubleshooting Rapido

### "Workflow not found"
→ `git pull origin main` e controlla `.github/workflows/`

### "OIDC token exchange failed"
→ Esegui nuovamente Step 1 (OIDC setup)

### "Permission denied on Cloud Run"
→ Verifica ruoli del service account in Step 1 (roles/run.admin)

### "Docker push failed"
→ Verifica `roles/artifactregistry.writer` su service account

### "Workflow syntax error"
→ Controlla YAML indentation in `.github/workflows/*.yml`

---

## 📝 File di Riferimento

- **Setup guide OIDC:** [GITHUB_OIDC_SETUP.md](docs/GITHUB_OIDC_SETUP.md)
- **Setup GitHub secrets:** [GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md)
- **Branching strategy:** [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md)

---

## ⏱️ Tempo Totale Setup

```
Step 1 (OIDC):         ~10 minuti
Step 2-3 (Secrets):    ~5 minuti
Step 4 (Verify):       ~1 minuto
Step 5 (Test PR):      ~5 minuti
Step 6 (Test Deploy):  ~10 minuti
Step 7 (Slack opt):    ~5 minuti
─────────────────────────────
TOTALE:                ~36 minuti (con Slack)
SENZA SLACK:           ~31 minuti
```

---

## ✨ Dopo il Setup

Una volta completato:

- ✅ Ogni PR avrà test automatici
- ✅ Ogni merge a main deployera automaticamente
- ✅ Potrai fare deploy manuali da GitHub UI (Workflow Dispatch)
- ✅ Riceverai notifiche Slack su success/failure
- ✅ Zero secrets in GitHub (tutto via OIDC)
- ✅ Audit trail completo su GitHub Actions

**Goditi il deploy automatico! 🚀**
