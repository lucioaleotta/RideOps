#!/usr/bin/env bash
set -euo pipefail

# ---------------------------
# CONFIG
# ---------------------------
OWNER="lucioaleotta"
REPO="RideOps"
VISIBILITY="public"   # "public" oppure "private"

# ---------------------------
# PRECHECKS
# ---------------------------
command -v gh >/dev/null 2>&1 || { echo "ERROR: gh (GitHub CLI) non trovato. Installalo e riprova."; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "ERROR: non sei loggato. Esegui: gh auth login"; exit 1; }

FULL_REPO="${OWNER}/${REPO}"

echo "==> Repo target: ${FULL_REPO}"

# ---------------------------
# CREATE REPO IF NEEDED
# ---------------------------
if gh repo view "${FULL_REPO}" >/dev/null 2>&1; then
  echo "==> Repo già esistente: ${FULL_REPO}"
else
  echo "==> Creo repo ${FULL_REPO} (${VISIBILITY})..."
  gh repo create "${FULL_REPO}" --${VISIBILITY} \
    --description "RideOps monorepo - Java 21 Spring Boot (Modulith + Hexagonal) + Next.js (App Router) + Postgres/Flyway + Docker Compose" \
    --add-readme
fi

# ---------------------------
# LABELS (idempotent via --force)
# ---------------------------
echo "==> Creo/Aggiorno labels..."

create_label () {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --repo "$FULL_REPO" --color "$color" --description "$desc" --force >/dev/null
}

# types
create_label "epic"   "5319E7" "Epic"
create_label "story"  "1D76DB" "User story"
create_label "task"   "0E8A16" "Technical task"
create_label "bug"    "D73A4A" "Bug"

# areas
create_label "backend" "0052CC" "Backend"
create_label "frontend" "C5DEF5" "Frontend"
create_label "devops" "FBCA04" "DevOps"
create_label "docs" "BFDADC" "Documentation"

# modules
create_label "module-identity" "A2EEEF" "Identity module"
create_label "module-services" "A2EEEF" "Services module"
create_label "module-dispatch" "A2EEEF" "Dispatch module"
create_label "module-fleet" "A2EEEF" "Fleet module"
create_label "module-accounting" "A2EEEF" "Accounting module"
create_label "module-analytics" "A2EEEF" "Analytics module"

# steps
for i in {1..12}; do
  create_label "step-$i" "EDEDED" "Step $i"
done

# priorities
create_label "P0" "B60205" "Priority 0"
create_label "P1" "D93F0B" "Priority 1"
create_label "P2" "FBCA04" "Priority 2"
create_label "P3" "0E8A16" "Priority 3"

# ---------------------------
# MILESTONES (5 giorni - MVP)
# ---------------------------
# gh non ha comando milestone ufficiale in tutte le versioni: uso gh api REST.
echo "==> Creo milestones (se mancanti)..."

ensure_milestone () {
  local title="$1"
  # Check existing
  if gh api "repos/${FULL_REPO}/milestones?state=all&per_page=100" --jq ".[] | select(.title==\"${title}\") | .number" | grep -q '[0-9]'; then
    echo "   - milestone già presente: ${title}"
  else
    gh api -X POST "repos/${FULL_REPO}/milestones" -f title="${title}" >/dev/null
    echo "   - milestone creata: ${title}"
  fi
}

ensure_milestone "MVP - Week 1 (5 days)"
MILESTONE_TITLE="MVP - Week 1 (5 days)"

# Get milestone number
MILESTONE_NUMBER="$(gh api "repos/${FULL_REPO}/milestones?state=all&per_page=100" --jq '.[] | select(.title=="MVP - Week 1 (5 days)") | .number' | head -n 1)"
if [[ -z "${MILESTONE_NUMBER}" ]]; then
  echo "ERROR: non riesco a leggere il numero milestone. Esco."
  exit 1
fi

# ---------------------------
# HELPERS: CREATE ISSUE AND RETURN NUMBER
# ---------------------------
create_issue () {
  local title="$1"
  local body="$2"
  local labels_csv="$3"  # comma separated labels
  local milestone="${4:-}"

  local args=(issue create --repo "$FULL_REPO" --title "$title" --body "$body" --label "$labels_csv")
  if [[ -n "$milestone" ]]; then
    if [[ "$milestone" =~ ^[0-9]+$ ]]; then
      milestone="$(gh api "repos/${FULL_REPO}/milestones/${milestone}" --jq '.title')"
    fi
    args+=(--milestone "$milestone")
  fi

  local issue_url
  issue_url="$(gh "${args[@]}")"
  echo "${issue_url##*/}"
}

# ---------------------------
# EPICS + STORIES/TASKS
# ---------------------------
echo "==> Creo epiche + stories/tasks..."

# EPIC 1
EPIC1_NUM="$(create_issue \
"EPIC-1 Bootstrap & Local Dev" \
"Obiettivo: avvio locale end-to-end (backend+db+migrations+frontend).\n\nDeliverable:\n- docker compose up\n- backend: /actuator/health\n- flyway applica migration\n- frontend: homepage 'it works'\n\nChecklist:\n- Spring Boot + Modulith + Hexagonal skeleton\n- Docker Compose (Postgres + app)\n- Flyway baseline\n- CI base\n" \
"epic,step-1,P0,devops" \
"$MILESTONE_TITLE")"

create_issue "S1.1 Setup monorepo structure" \
"Collega all'EPIC #${EPIC1_NUM}\n\n- Crea /backend e /frontend\n- README root con comandi run\n" \
"story,step-1,P0,docs,devops" "$MILESTONE_NUMBER" >/dev/null

create_issue "T1.2 Backend skeleton: Spring Boot 3 + Java 21 + Maven + Modulith" \
"EPIC: #${EPIC1_NUM}\n\n- Dipendenze: Web, Security, Data JPA, Flyway, Postgres, Actuator, Validation, Modulith\n- Package per moduli: identity/services/fleet/accounting/analytics\n- Struttura hex: domain/application/adapters.in/adapters.out\n" \
"task,step-1,P0,backend,devops" "$MILESTONE_NUMBER" >/dev/null

create_issue "T1.3 DB + Flyway baseline" \
"EPIC: #${EPIC1_NUM}\n\n- Postgres container\n- Flyway migration V1__baseline.sql (es: app_meta)\n" \
"task,step-1,P0,backend,devops" "$MILESTONE_NUMBER" >/dev/null

create_issue "T1.4 Docker Compose (v2 + fallback v1)" \
"EPIC: #${EPIC1_NUM}\n\n- compose con servizi: postgres, backend, frontend\n- env vars e network\n" \
"task,step-1,P0,devops" "$MILESTONE_NUMBER" >/dev/null

create_issue "T1.5 Frontend skeleton: Next.js App Router + TS" \
"EPIC: #${EPIC1_NUM}\n\n- Layout base\n- Pagina / con 'RideOps'\n- Env per API url\n" \
"task,step-1,P0,frontend" "$MILESTONE_NUMBER" >/dev/null

create_issue "T1.6 CI base: build + test" \
"EPIC: #${EPIC1_NUM}\n\n- GitHub Actions: backend mvn test\n- frontend npm ci + build\n" \
"task,step-1,P1,devops" "$MILESTONE_NUMBER" >/dev/null


# EPIC 2
EPIC2_NUM="$(create_issue \
"EPIC-2 Identity & Access (JWT + Forgot Password)" \
"Obiettivo: autenticazione completa (ADMIN/GESTIONALE/DRIVER), JWT, forgot/reset.\n\nDeliverable:\n- POST /auth/login => JWT\n- GET /auth/me => user + roles\n- Forgot/reset password token-based\n- UI login/forgot/reset + route protection\n" \
"epic,step-2,P0,module-identity,backend,frontend" \
"$MILESTONE_TITLE")"

create_issue "S2.1 User + Role model + seed admin" \
"EPIC: #${EPIC2_NUM}\n\n- Tabelle: users, roles (o enum), user_roles\n- Seed admin via migration o runner\n" \
"story,step-2,P0,module-identity,backend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S2.2 JWT login + /me + RBAC" \
"EPIC: #${EPIC2_NUM}\n\n- /auth/login, /auth/me\n- SecurityFilterChain + JwtFilter\n- Method security per ruoli\n" \
"story,step-2,P0,module-identity,backend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S2.3 UI Login + route guard" \
"EPIC: #${EPIC2_NUM}\n\n- Login form\n- Token handling (cookie httpOnly consigliato)\n- Protezione route (middleware)\n" \
"story,step-2,P0,module-identity,frontend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S2.4 Forgot password token-based + reset password" \
"EPIC: #${EPIC2_NUM}\n\n- POST /auth/forgot-password\n- POST /auth/reset-password\n- Anti-enumeration\n- Email stub (log/outbox table)\n" \
"story,step-3,P0,module-identity,backend,frontend" "$MILESTONE_NUMBER" >/dev/null


# EPIC 3
EPIC3_NUM="$(create_issue \
"EPIC-3 User Management (Admin)" \
"Obiettivo: admin crea utenti (gestionale/driver) e li gestisce.\n\nDeliverable:\n- Admin: create user\n- Admin: list users\n- Enable/disable user\n- UI tabellare\n" \
"epic,step-4,P1,module-identity" \
"$MILESTONE_TITLE")"

create_issue "S3.1 Admin create user (role + password temp)" \
"EPIC: #${EPIC3_NUM}\n\n- Endpoint admin\n- Validazioni (email unique, password rules)\n" \
"story,step-4,P1,module-identity,backend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S3.2 Admin list users + enable/disable" \
"EPIC: #${EPIC3_NUM}\n\n- List pageable\n- Toggle enabled\n" \
"story,step-4,P2,module-identity,backend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S3.3 UI Users table + create user dialog" \
"EPIC: #${EPIC3_NUM}\n\n- Table\n- Create form\n- Enable/disable action\n" \
"story,step-4,P2,module-identity,frontend" "$MILESTONE_NUMBER" >/dev/null


# EPIC 4
EPIC4_NUM="$(create_issue \
"EPIC-4 Services Core (CRUD + Close + Print)" \
"Obiettivo: gestione servizi end-to-end.\n\nDeliverable:\n- CRUD servizio\n- Chiusura servizio\n- Stampa (HTML print-friendly)\n" \
"epic,step-5,P0,module-services" \
"$MILESTONE_TITLE")"

create_issue "S4.1 Create/Update/Delete service (soft delete)" \
"EPIC: #${EPIC4_NUM}\n\nCampi minimi: startAt, pickup, dropoff, type(TRANSFER/TOUR), durationHours, notes, status\n" \
"story,step-5,P0,module-services,backend,frontend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S4.2 Close service (state machine + rules)" \
"EPIC: #${EPIC4_NUM}\n\n- OPEN -> CLOSED (regole a scelta)\n- Test di dominio\n" \
"story,step-5,P1,module-services,backend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S4.3 Print view (HTML print-friendly)" \
"EPIC: #${EPIC4_NUM}\n\n- Pagina stampa con dettagli: ora, luogo, da-a, tipologia, durata\n- CSS @media print\n" \
"story,step-5,P1,module-services,frontend" "$MILESTONE_NUMBER" >/dev/null


# EPIC 5
EPIC5_NUM="$(create_issue \
"EPIC-5 Dispatch Driver (Assign + Driver Today)" \
"Obiettivo: assegnazione ai driver e vista driver.\n\nDeliverable:\n- assign/unassign\n- driver vede servizi di oggi\n" \
"epic,step-6,P0,module-dispatch" \
"$MILESTONE_TITLE")"

create_issue "S5.1 Assign/unassign service to driver + audit" \
"EPIC: #${EPIC5_NUM}\n\n- Chi ha assegnato, quando\n- Regole: no assign se CLOSED\n" \
"story,step-6,P0,module-dispatch,backend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S5.2 Driver dashboard: today + upcoming" \
"EPIC: #${EPIC5_NUM}\n\n- Lista ordinata per ora\n" \
"story,step-6,P0,module-dispatch,frontend" "$MILESTONE_NUMBER" >/dev/null


# EPIC 6
EPIC6_NUM="$(create_issue \
"EPIC-6 Calendar Dashboard (Month/Week/Day)" \
"Obiettivo: dashboard calendario (mese/settimana/giorno).\n\nDeliverable:\n- vista mese\n- switch week/day\n- click evento -> dettaglio\n" \
"epic,step-7,P1,module-services,frontend,backend" \
"$MILESTONE_TITLE")"

create_issue "S6.1 API: services by date range + filters" \
"EPIC: #${EPIC6_NUM}\n\n- GET /services?from&to&driverId&status&type\n- Indici DB\n" \
"story,step-7,P1,module-services,backend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S6.2 UI Calendar month/week/day" \
"EPIC: #${EPIC6_NUM}\n\n- MVP anche semplice (grid)\n- Filtri base\n" \
"story,step-7,P1,module-services,frontend" "$MILESTONE_NUMBER" >/dev/null


# EPIC 7 (post-MVP, ma lo creo comunque)
EPIC7_NUM="$(create_issue \
"EPIC-7 Fleet (Vehicles + Deadlines + Unavailability)" \
"Obiettivo: gestione veicoli, scadenze e indisponibilità.\n\nDeliverable:\n- CRUD veicoli\n- Scadenze (assicurazione/bollo/tagliandi)\n- Indisponibilità manutenzione\n" \
"epic,step-8,P3,module-fleet" \
"$MILESTONE_TITLE")"

create_issue "S7.1 CRUD vehicles" \
"EPIC: #${EPIC7_NUM}\n\n- targa, posti, tipo, note\n" \
"story,step-8,P3,module-fleet,backend,frontend" "$MILESTONE_NUMBER" >/dev/null

create_issue "S7.2 Deadlines + Unavailability (no overlaps)" \
"EPIC: #${EPIC7_NUM}\n\n- Vincolo: no indisponibilità sovrapposte per veicolo\n" \
"story,step-8,P3,module-fleet,backend" "$MILESTONE_NUMBER" >/dev/null


# EPIC 8 (post-MVP)
EPIC8_NUM="$(create_issue \
"EPIC-8 Accounting MVP" \
"Obiettivo: micro contabilità (incassi/costi/report mensile).\n" \
"epic,step-10,P3,module-accounting" \
"$MILESTONE_TITLE")"

create_issue "S8.1 Transactions model + monthly report" \
"EPIC: #${EPIC8_NUM}\n\n- income (anche % esterno)\n- costs: manutenzione, carburante, tasse, assicurazioni\n- report: income/costs/margin\n" \
"story,step-10,P3,module-accounting,backend,frontend" "$MILESTONE_NUMBER" >/dev/null


# EPIC 9 (post-MVP)
EPIC9_NUM="$(create_issue \
"EPIC-9 Analytics (Driver allocation + 12 months chart)" \
"Obiettivo: workload driver e grafici.\n" \
"epic,step-11,P3,module-analytics" \
"$MILESTONE_TITLE")"

create_issue "S9.1 Aggregations endpoints + UI charts" \
"EPIC: #${EPIC9_NUM}\n\n- servizi per driver (mese/giorno/anno)\n- grafico 12 mesi\n" \
"story,step-11,P3,module-analytics,backend,frontend" "$MILESTONE_NUMBER" >/dev/null


# EPIC 10 (hardening)
EPIC10_NUM="$(create_issue \
"EPIC-10 Hardening & Quality" \
"Obiettivo: qualità, sicurezza e test integrazione.\n" \
"epic,step-12,P3,devops" \
"$MILESTONE_TITLE")"

create_issue "S10.1 Testcontainers integration tests (core flows)" \
"EPIC: #${EPIC10_NUM}\n\n- login\n- create service\n- assign driver\n" \
"story,step-12,P3,backend" "$MILESTONE_NUMBER" >/dev/null

echo
echo "✅ FATTO!"
echo "Repo: https://github.com/${FULL_REPO}"
echo "Epiche create: #${EPIC1_NUM} #${EPIC2_NUM} #${EPIC3_NUM} #${EPIC4_NUM} #${EPIC5_NUM} #${EPIC6_NUM} #${EPIC7_NUM} #${EPIC8_NUM} #${EPIC9_NUM} #${EPIC10_NUM}"