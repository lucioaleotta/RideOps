# GitHub OIDC Setup per Google Cloud

Guida per configurare l'autenticazione federata tra GitHub e Google Cloud (zero secrets in GitHub!).

## Prerequisiti

- GCP Project: `rideops-489909`
- Accesso a `gcloud` CLI con permessi Admin
- Repository GitHub: `lucioaleotta/RideOps`

## Step 1: Abilitare Workload Identity Federation in GCP

```bash
# Set project
export PROJECT_ID="rideops-489909"
gcloud config set project $PROJECT_ID

# Abilita necessarie APIs
gcloud services enable iamcredentials.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable sts.googleapis.com
```

## Step 2: Creare Workload Identity Pool

```bash
# Crea il pool
gcloud iam workload-identity-pools create "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions"

# Nota l'output: PROJECT_NUMBER
export WORKLOAD_IDENTITY_POOL_ID="github"
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
echo "PROJECT_NUMBER=$PROJECT_NUMBER"
```

## Step 3: Creare Workload Identity Provider (GitHub)

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-condition="assertion.repository=='lucioaleotta/RideOps'"
```

Questo configura il provider a:
- ✅ Accettare token da GitHub Actions
- ✅ Mappare subject, actor, repository, owner e ref da JWT
- ✅ Limitare l'accesso al solo repository `lucioaleotta/RideOps`

## Step 4: Creare Service Account per CI/CD

```bash
# Crea service account
gcloud iam service-accounts create github-actions \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions CI/CD"

# Note l'email
export SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
echo "SERVICE_ACCOUNT=$SERVICE_ACCOUNT"

# Grant role per Cloud Run deploy
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin"

# Grant role per Artifact Registry push
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer"

# Grant role per Cloud Build trigger
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudbuild.builds.editor"

# Grant role per legere service accounts (per iam.serviceAccountTokenCreator)
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountTokenCreator"
```

## Step 5: Configurare Workload Identity Binding

```bash
# Crea il binding tra GitHub e Service Account
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/lucioaleotta/RideOps"
```

**Questo binds:**
- Repository: `lucioaleotta/RideOps`
- Service Account: `github-actions@rideops-489909.iam.gserviceaccount.com`
- Tutto è basato su OIDC token, zero secrets! ✨

## Step 6: Creare Google Cloud Storage Bucket per Artifacts (opzionale)

```bash
gsutil mb -p "${PROJECT_ID}" gs://rideops-artifacts/
```

## Step 7: Aggiungere Variabili d'Ambiente in GitHub

Vai a **Repository Settings → Secrets and variables → Variables** e aggiungi:

```
WIF_PROVIDER=projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider
WIF_SERVICE_ACCOUNT=github-actions@rideops-489909.iam.gserviceaccount.com
PROJECT_ID=rideops-489909
GCP_REGION=europe-west1
BACKEND_SERVICE=rideops-backend
FRONTEND_SERVICE=rideops-frontend
ARTIFACT_REGISTRY_REPO=europe-west1-docker.pkg.dev/rideops-489909/rideops
```

Sostituisci `PROJECT_NUMBER` con il valore trovato in Step 2.

## Step 8: Test OIDC Binding

```bash
# Questo comand mostra se il binding è corretto
gcloud iam service-accounts get-iam-policy "${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}"

# Dovresti vedere la riga con workloadIdentityUser per il tuo repository
```

---

## Workflow GitHub Snippet

Nel tuo workflow, usa:

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ vars.WIF_PROVIDER }}
    service_account: ${{ vars.WIF_SERVICE_ACCOUNT }}

- name: Set up Cloud SDK
  uses: google-github-actions/setup-gcloud@v1
```

---

## Troubleshooting

### "Error 403: Forbidden"
→ Verifica che il binding sia corretto con `gcloud iam service-accounts get-iam-policy`

### "Token endpoint returned 401"
→ Verifica l'issuer URI: DEVE essere `https://token.actions.githubusercontent.com`

### "Invalid audience"
→ Nel provider, check che `attribute-condition` includere il tuo repository owner

---

## Cleanup (se necessario)

```bash
# Elimina provider
gcloud iam workload-identity-pools providers delete "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github"

# Elimina pool
gcloud iam workload-identity-pools delete "github" \
  --project="${PROJECT_ID}" \
  --location="global"

# Elimina service account
gcloud iam service-accounts delete "${SERVICE_ACCOUNT}" --project="${PROJECT_ID}"
```

---

## Riferimenti

- [Google Workload Identity Federation](https://cloud.google.com/docs/authentication/workload-identity-federation)
- [GitHub Actions Auth](https://github.com/google-github-actions/auth)
- [GCP Service Accounts](https://cloud.google.com/docs/authentication/application-default-credentials)
