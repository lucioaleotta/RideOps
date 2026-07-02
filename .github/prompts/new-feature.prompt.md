---
name: 'Nuova feature'
description: 'Avvia il workflow completo per una nuova unità di lavoro: issue, branch, sviluppo, verifica, commit, PR.'
mode: agent
---

# Workflow per una nuova issue

Sei AssitenteOne. Segui questi step **nell'ordine**, senza saltarne nessuno.

## Step 1 — Crea la issue su GitHub

Ogni unità di lavoro deve avere una issue. Se non esiste, creala con:
- Titolo descrittivo in inglese
- Label appropriata: `backend`, `frontend`, `docs`, `chore`, `security`
- Assegnata a te (AssitenteOne)

## Step 2 — Crea il branch da `main`

```bash
git checkout main
git pull origin main
git checkout -b <tipo>/ISSUE-<numero>-<descrizione-breve>
```

**Pattern obbligatorio per il nome del branch:**

| Tipo di lavoro     | Prefisso    | Esempio                                    |
|--------------------|-------------|--------------------------------------------|
| Nuova feature      | `feature/`  | `feature/ISSUE-12-add-vehicle-tracking`    |
| Bug fix            | `fix/`      | `fix/ISSUE-45-logout-redirect-url`         |
| Documentazione     | `docs/`     | `docs/testing-guide`                       |
| Manutenzione/deps  | `chore/`    | `chore/update-nextjs-version`              |
| Refactoring        | `refactor/` | `refactor/simplify-middleware-auth`        |

Regole:
- Sempre da `main`, mai da altri branch
- Descrizione in kebab-case, breve (3-5 parole)
- Numero issue sempre presente per feature e fix

## Step 3 — Sviluppo locale

Usa **Conventional Commits** per ogni commit:

```
feat(area): descrizione breve
fix(area): descrizione breve
docs(area): descrizione breve
test(area): descrizione breve
chore: descrizione breve
refactor(area): descrizione breve
```

Esempio:
```
feat(vehicle): add GPS tracking endpoint

- Implemented POST /vehicles/:id/location
- Added background job for polling
- Tests: +5 new test cases
```

Durante lo sviluppo, le regole ArchUnit e di logging si applicano
automaticamente in base ai file che tocchi (vedi `.github/instructions/`).

## Step 4 — Verifica locale prima del push

**Backend:**
```bash
cd backend && mvn -B verify
```

**Frontend:**
```bash
cd frontend && npm run build && npm run lint
```

Non fare push se uno dei due fallisce. Mostra l'output completo all'utente.

Se `mvn -B verify` fallisce per una violazione ArchUnit: mostra la regola
violata e il motivo (riferimento CWE), correggi il codice, riesegui la
verifica prima di riproporre il commit.

## Step 5 — Chiedi conferma, poi commit e push

**Prima del commit**: mostra un riepilogo delle modifiche (file toccati,
test aggiunti). Non procedere mai senza conferma esplicita dell'utente.

## Step 6 — Apri la Pull Request

- Titolo: `[ISSUE-<numero>] Descrizione breve`
- Usa il template PR standard (vedi `docs/BRANCHING_STRATEGY.md`)
- Assegna almeno 1 reviewer
- Label: `backend`, `frontend`, o entrambi
- Attendi CI verde prima di chiedere review

Prima della PR: mostra titolo, descrizione e checklist compilata
(vedi `.github/prompts/pre-pr-check.prompt.md`). Non procedere senza
conferma esplicita dell'utente.

## Step 7 — Merge e pulizia

- Merge con **Squash + Merge** (mai merge commit, mai rebase)
- Elimina il branch remoto dopo il merge
- Pulizia locale:
```bash
git checkout main && git pull origin main
git branch -d <nome-branch>
```
- Chiudi la issue solo dopo merge approvato
