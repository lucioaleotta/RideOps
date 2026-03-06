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
./dev.sh start
./dev.sh login
./dev.sh me
./dev.sh ping-admin
./dev.sh stop
```

Comandi principali disponibili:
- locale veloce: `start`, `stop`, `restart`, `status`
- DB container: `db-start`, `db-stop`, `db-restart`, `db-logs`
- processi locali: `backend-start|stop|restart|logs`, `frontend-start|stop|restart|logs`
- container full (fallback): `up`, `down`, `ps`, `logs [service]`
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
- `POST /auth/login` -> ritorna access token JWT (login con `userId` + `password`)
- `GET /auth/me` -> ritorna utente autenticato e ruolo
- `POST /auth/forgot-password` -> risposta anti-enumeration (sempre generica)
- `POST /auth/reset-password` -> reset password con token
- Rotte ruolo test:
	- `/admin/ping` (ADMIN)
	- `/gestionale/ping` (ADMIN, GESTIONALE)
	- `/driver/ping` (ADMIN, DRIVER)

Admin seed default:
- userId: `admin`
- email: `admin@rideops.local`
- password: `ChangeMe123!`

Frontend:
- login page: `http://localhost:5173/login`
- forgot page: `http://localhost:5173/forgot-password`
- reset page: `http://localhost:5173/reset-password?token=...`
- area protetta: `http://localhost:5173/app/**` (middleware + cookie `httpOnly`)

### Services Core (EPIC-04)

Ruoli abilitati: `ADMIN`, `GESTIONALE`.

Backend API (`/services`):
- `GET /services` -> lista servizi
- `GET /services/{id}` -> dettaglio servizio
- `POST /services` -> crea servizio
- `PUT /services/{id}` -> aggiorna servizio
- `DELETE /services/{id}` -> elimina servizio
- `PATCH /services/{id}/close` -> chiude servizio

Flusso stato servizio:
- `OPEN -> ASSIGNED -> CLOSED`
- chiusura consentita solo quando il servizio è `ASSIGNED`

Frontend:
- area servizi: `http://localhost:5173/app/services`
- stampa A4: `http://localhost:5173/services/{id}/print`
- lista servizi paginata con form di creazione/modifica apribile/chiudibile

Importi (standard unico):
- formattazione centralizzata EUR (`it-IT`) tramite utility `frontend/lib/currency.ts`
- usare sempre questa utility in tutte le pagine/form per evitare formattazioni locali duplicate

MVP email reset:
- Il link reset viene salvato in tabella `email_outbox` e loggato dal backend (stub email).

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
