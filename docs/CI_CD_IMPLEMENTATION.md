# CI/CD Implementation

Implementazione CI/CD attuale: GitHub Actions + GHCR + deploy su Hetzner VPS via SSH.

## Workflow principale

- File: `.github/workflows/deploy-hetzner.yml`
- Trigger:
  - push/merge su `main`
  - `workflow_dispatch` (manuale)

## Pipeline

1. `test-backend`
- Esegue test Maven backend.

2. `build-and-push`
- Build immagini Docker backend/frontend.
- Push su GHCR con tag SHA e `latest`.

3. `deploy`
- Sincronizza config/scripts su server (`/opt/rideops`).
- Esegue deploy via SSH (`pull-and-restart.sh`).
- Effettua health check HTTP.

## Secrets richiesti

- `HETZNER_HOST`
- `HETZNER_SSH_KEY`

## File sincronizzati nel deploy

- `scripts/server/**`
- `scripts/copy_ssl_and_reload_nginx.sh`
- `nginx/**`
- `docker-compose.prod.yml`

## Verifica post-deploy

```bash
curl -sI https://rideops.it/
curl -sI https://rideops.it/login
```

## Riferimenti

- [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)
- [OPERATIONS.md](OPERATIONS.md)
- [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md)
