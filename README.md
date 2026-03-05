# RideOps Monorepo

Monorepo con:
- `backend`: Spring Boot Java 21 + Maven
- `frontend`: placeholder buildabile via Docker

## CI (GitHub Actions)

È attiva una pipeline backend su push e pull request verso `main`.

- workflow: `.github/workflows/backend-ci.yml`
- check principale: build Maven + test (`mvn -B verify`)

## Avvio con Docker Compose (dev)

### Compose v2 (consigliato)
```bash
docker compose --profile dev up --build
```

### Fallback Compose v1
```bash
docker-compose --profile dev up --build
```

Se il tuo `docker-compose` non supporta `--profile`:
1. prova `COMPOSE_PROFILES=dev docker-compose up --build`
2. in alternativa rimuovi temporaneamente le chiavi `profiles` da `docker-compose.yml`.

## Endpoint utili
- Backend API: `http://localhost:8080`
- Health Actuator: `http://localhost:8080/actuator/health`
- Frontend: `http://localhost:5173`

`/actuator/health` è esposto da Spring Boot Actuator (nessun controller custom necessario).

## Ciclo di sviluppo (ogni iterazione)

Per mantenere il repository sano ad ogni iterazione:

1. crea un branch feature da `main`
2. sviluppa la modifica in piccoli commit
3. verifica in locale:
	- `cd backend && mvn -B verify`
	- `docker compose --profile dev up --build` (se la modifica impatta runtime)
4. apri Pull Request verso `main`
5. fai merge solo con CI verde

In questo modo repository e qualità restano stabili nel tempo.
