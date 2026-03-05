# RideOps Monorepo

Monorepo con:
- `backend`: Spring Boot Java 21 + Maven
- `frontend`: placeholder buildabile via Docker

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
