# GitHub Actions CI/CD Setup Guide

Guida completa per abilitare CI/CD automatico con GitHub Actions integrato a Google Cloud.

## 📋 Checklist Prerequisiti

- [ ] Repository GitHub: `lucioaleotta/RideOps` ✅
- [ ] GCP Project: `rideops-489909` ✅
- [x] Workload Identity Federation configurato in GCP (pool `github`, provider `github-provider`, service account `github-actions@rideops-489909.iam.gserviceaccount.com`)
- [ ] Dockerfile presenti: `backend/Dockerfile`, `frontend/Dockerfile` ✅
- [ ] Maven POM configurato: `backend/pom.xml` ✅
- [ ] Next.js package.json: `frontend/package.json` ✅

---

## 🔑 Step 1: Configurare Secrets in GitHub

Vai a: **Repository → Settings → Secrets and variables → Secrets**

### Aggiungi questi secrets:

| Secret | Valore | Descrizione |
|--------|--------|-------------|
| `ADMIN_PASSWORD` | `<password-admin-prod>` | Password admin bootstrap backend |
| `SLACK_WEBHOOK` | `https://hooks.slack.com/...` | Webhook Slack (opzionale, per notifiche) |

**Dove trovarli:**

```bash
# ADMIN_PASSWORD: password admin iniziale in produzione

# SLACK_WEBHOOK (crea su Slack App, sezione Incoming Webhooks)
# https://api.slack.com/messaging/webhooks
```

---

## 🌍 Step 2: Configurare Variables (pubbliche) in GitHub

Vai a: **Repository → Settings → Secrets and variables → Variables**

### Aggiungi queste variabili:

| Variable | Valore | Descrizione |
|----------|--------|-------------|
| `WIF_PROVIDER` | `projects/9867177203/locations/global/workloadIdentityPools/github/providers/github-provider` | Workload Identity Provider |
| `WIF_SERVICE_ACCOUNT` | `github-actions@rideops-489909.iam.gserviceaccount.com` | Service Account per CI/CD |
| `PROJECT_ID` | `rideops-489909` | GCP Project ID |
| `GCP_REGION` | `europe-west1` | GCP Region |
| `BACKEND_SERVICE` | `rideops-backend` | Cloud Run service name (backend) |
| `BACKEND_SERVICE_STAGING` | `rideops-backend-staging` | Service staging (opzionale, usato da `workflow_dispatch`) |
| `FRONTEND_SERVICE` | `rideops-frontend` | Cloud Run service name (frontend) |
| `ARTIFACT_REGISTRY_REPO` | `europe-west1-docker.pkg.dev/rideops-489909/rideops` | Artifact Registry path |
| `DB_HOST` | `<cloud-sql-ip-o-hostname>` | Host PostgreSQL backend |
| `DB_PORT` | `5432` | Porta PostgreSQL backend |
| `DB_NAME` | `rideops` | Nome database backend |
| `DB_USER` | `rideops` | Utente database backend |
| `DB_PASSWORD_SECRET_REF` | `rideops-db-password:latest` | Secret Manager ref per `DB_PASSWORD` |
| `JWT_SECRET_REF` | `rideops-jwt-secret:latest` | Secret Manager ref per `JWT_SECRET` |

**Dove trovarli:**

```bash
# WIF_PROVIDER - già risolto per il progetto RideOps
echo "projects/9867177203/locations/global/workloadIdentityPools/github/providers/github-provider"

# Tutti gli altri sono litterali (copia i valori sopra)
```

---

## ✅ Step 3: Verificare i Workflow

### Visualizzare i workflow creati:

Vai a: **Actions → All workflows**

Dovresti vedere:
- ✅ **Backend CI/CD** - test su PR, deploy su merge a main
- ✅ **Frontend CI/CD** - build su PR, deploy su merge a main
- ✅ **Docs CI** - check links, linting su PR

### Trigger test:

```bash
# Test su PR (non fa deploy)
git checkout -b feature/test-ci
echo "# test" >> README.md
git add README.md
git commit -m "test: trigger CI"
git push -u origin feature/test-ci
# Apri PR su GitHub → Actions eseguirà i test
```

---

## 🚀 Step 4: Workflow di Deploy

### Deploy automatico su merge a main:

```bash
# Crea PR
git checkout -b feature/my-feature
# fai modifiche...
git push -u origin feature/my-feature

# Apri PR su GitHub
# → GitHub Actions eseguirà i test
# → Se OK, fai merge su main
# → GitHub Actions auto-deploy a Cloud Run
```

### Deploy manuale (on-demand):

Vai a: **Actions → Backend CI/CD** (o Frontend CI/CD)

Clicca: **Run workflow**
- Seleziona: `main` branch
- Input: `prod` o `staging`
- Clicca: **Run workflow** ✅

---

## 🐛 Troubleshooting

### "Error: OIDC token exchange failed"

**Causa:** Workload Identity Federation non configurato  
**Soluzione:** Esegui tutti gli step in `GITHUB_OIDC_SETUP.md`

```bash
# Verifica il binding
gcloud iam service-accounts get-iam-policy \
  github-actions@rideops-489909.iam.gserviceaccount.com \
  --project=rideops-489909

# Verifica pool/provider attivi
gcloud iam workload-identity-pools describe github \
  --project=rideops-489909 \
  --location=global

gcloud iam workload-identity-pools providers describe github-provider \
  --project=rideops-489909 \
  --location=global \
  --workload-identity-pool=github
```

### "Docker image push failed: 403 Forbidden"

**Causa:** Service Account non ha permessi su Artifact Registry  
**Soluzione:**

```bash
gcloud projects add-iam-policy-binding rideops-489909 \
  --member="serviceAccount:github-actions@rideops-489909.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### "Cloud Run deployment failed: Permission denied"

**Causa:** Service Account non ha `roles/run.admin`  
**Soluzione:**

```bash
gcloud projects add-iam-policy-binding rideops-489909 \
  --member="serviceAccount:github-actions@rideops-489909.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

### Workflow non trovato in GitHub

**Causa:** Workflow file non committato o percorso errato  
**Soluzione:**

```bash
# Verifica file
ls -la .github/workflows/
# Dovrebbe avere: backend-ci.yml backend-cd.yml frontend-cd.yml docs-ci.yml

# Fai commit e push
git add .github/workflows/
git commit -m "ci: add CI/CD workflows"
git push origin main
```

---

## 📊 Monitoring

### Visualizzare i run dei workflow:

**GitHub UI:**
- Settings → Actions → All workflows
- Clicca su workflow → Vedi runs
- Clicca su run → Vedi step-by-step output

### Logs CLI:

```bash
# Backend deploy
gh run list --workflow=backend-cd.yml --limit=5

# Vedi output di specifico run
gh run view RUN_ID --log

# Non disponibile in zsh? Installa GitHub CLI:
brew install gh
gh auth login
```

### Slack notifications:

Se configurati, riceverai notifiche su:
- ✅ Deploy success
- ❌ Deploy failure

---

## 🔄 Ciclo di Sviluppo Completo

### 1. Developer crea feature branch

```bash
git checkout -b feature/ISSUE-123-descrizione
# fai modifiche...
git push -u origin feature/ISSUE-123-descrizione
```

### 2. GitHub Actions esegue test (PR check)

```
✅ Backend test (mvn verify)
✅ Frontend lint & build (npm run build)
✅ Docs validation
```

### 3. Developer/Reviewer mergia su main

```bash
# Su GitHub UI: clicca "Squash and merge"
```

### 4. GitHub Actions auto-deploy

```
✅ Backend: build → push → Cloud Run deploy
✅ Frontend: build → push → Cloud Run deploy
✅ Slack notification: ✅ Deployed successfully
```

### 5. Verifica in produzione

```bash
# Backend health
curl https://rideops-backend-fgnnhhq3va-ew.a.run.app/actuator/health

# Frontend login
curl https://rideops-frontend-9867177203.europe-west1.run.app/login
```

---

## 📚 File Correlati

- Configurazione OIDC: [GITHUB_OIDC_SETUP.md](GITHUB_OIDC_SETUP.md)
- Strategia branching: [../BRANCHING_STRATEGY.md](../BRANCHING_STRATEGY.md)
- Workflow backend: [../.github/workflows/backend-cd.yml](../.github/workflows/backend-cd.yml)
- Workflow frontend: [../.github/workflows/frontend-cd.yml](../.github/workflows/frontend-cd.yml)
- Workflow docs: [../.github/workflows/docs-ci.yml](../.github/workflows/docs-ci.yml)

---

## 🎯 Prossimi Step

1. ✅ Esegui gli step in `GITHUB_OIDC_SETUP.md` (setup OIDC)
2. ✅ Aggiungi secrets e variabili in GitHub (questo file)
3. ✅ Fai commit dei workflow `.github/workflows/*.yml`
4. ✅ Crea una PR test per verificare
5. ✅ Monitora il primo deploy automatico

**Fatto? Goditi il deploy automatico! 🚀**
