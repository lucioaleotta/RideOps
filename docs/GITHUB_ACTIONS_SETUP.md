# GitHub Actions Setup (Hetzner)

Guida rapida per configurare il deploy automatico di RideOps su Hetzner.

## Prerequisiti

- Repository GitHub: `lucioaleotta/RideOps`
- Server Hetzner raggiungibile via SSH
- Docker installato sul server

## Secrets GitHub

Vai in: `Settings -> Secrets and variables -> Actions`.

Aggiungi:

- `HETZNER_HOST`: IP del server (es. `91.98.196.151`)
- `HETZNER_SSH_KEY`: chiave privata SSH del server

## Workflow utilizzati

- `deploy-hetzner.yml`: deploy produzione
- `backend-ci.yml`: test backend
- `docs-ci.yml`: qualità documentazione

## Trigger deploy

- Automatico: push su `main`
- Manuale: `workflow_dispatch`

## Verifica deploy

1. Apri GitHub Actions e controlla run `Deploy to Hetzner`.
2. Verifica URL:

```bash
curl -sI https://rideops.it/
curl -sI https://rideops.it/login
```

## Troubleshooting

- Se il deploy fallisce su SSH:
  - verifica `HETZNER_HOST`
  - verifica formato di `HETZNER_SSH_KEY`
  - verifica che la porta 22 sia aperta sul server

- Se il portale non si aggiorna dopo deploy:
  - verifica sync config Nginx (`nginx/**`)
  - verifica restart dei container nel log del job

## Riferimenti

- [CI_CD_IMPLEMENTATION.md](CI_CD_IMPLEMENTATION.md)
- [OPERATIONS.md](OPERATIONS.md)
- [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md)
