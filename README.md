# RideOps Monorepo

Monorepo con:
- `backend`: Spring Boot Java 21 + Maven
- `frontend`: Next.js App Router (login + middleware ruoli)

## CI (GitHub Actions)

È attiva una pipeline backend su push e pull request verso `main`.

- workflow: `.github/workflows/backend-ci.yml`
- check principale: build Maven + test (`mvn -B verify`)

## Avvio con Docker Compose (dev)

### Script rapido `dev.sh`

Per velocizzare i test in locale puoi usare lo script root:

```bash
./dev.sh help
./dev.sh up
./dev.sh login
./dev.sh me
./dev.sh ping-admin
./dev.sh down
```

Comandi principali disponibili:
- `up`, `down`, `restart`, `ps`, `logs [service]`
- `backend-test`, `frontend-build`, `check`
- `login [email] [password]`, `me [token]`
- `ping-admin`, `ping-gestionale`, `ping-driver`, `logout`

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

### Identity (JWT)
- `POST /auth/login` -> ritorna access token JWT
- `GET /auth/me` -> ritorna utente autenticato e ruolo
- Rotte ruolo test:
	- `/admin/ping` (ADMIN)
	- `/gestionale/ping` (ADMIN, GESTIONALE)
	- `/driver/ping` (ADMIN, DRIVER)

Admin seed default:
- email: `admin@rideops.local`
- password: `ChangeMe123!`

Frontend:
- login page: `http://localhost:5173/login`
- area protetta: `http://localhost:5173/app/**` (middleware + cookie `httpOnly`)

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
