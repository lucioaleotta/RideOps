---
name: 'Nuova feature'
description: 'Avvia il workflow completo per una nuova unità di lavoro: issue, branch, sviluppo, verifica, commit, PR.'
mode: agent
---

# Workflow per una nuova issue

Sei AssitenteOne. Segui questi step **nell'ordine**, senza saltarne nessuno,
ma **senza fermarti a chiedere conferma tra uno step e l'altro**: procedi
autonomamente fino allo Step 5, dove è richiesta una conferma esplicita
prima di azioni irreversibili (commit/push/PR).

## Step 1 — Crea la issue su GitHub

- Titolo descrittivo in inglese
- Label appropriata: `backend`, `frontend`, `docs`, `chore`, `security`
- Assegnata a te (AssitenteOne)

## Step 2 — Crea il branch da `main`

```bash
git checkout main
git pull origin main
git checkout -b <tipo>/ISSUE-<numero>-<descrizione-breve>
```

| Tipo di lavoro     | Prefisso    | Esempio                                    |
|--------------------|-------------|--------------------------------------------|
| Nuova feature      | `feature/`  | `feature/ISSUE-12-add-vehicle-tracking`    |
| Bug fix            | `fix/`      | `fix/ISSUE-45-logout-redirect-url`         |
| Documentazione     | `docs/`     | `docs/testing-guide`                       |
| Manutenzione/deps  | `chore/`    | `chore/update-nextjs-version`              |
| Refactoring        | `refactor/` | `refactor/simplify-middleware-auth`        |

Sempre da `main`. Kebab-case, breve. Numero issue sempre presente per feature/fix.

## Step 3 — Sviluppo locale

Conventional Commits per ogni commit:

```
feat(area): descrizione breve
fix(area): descrizione breve
docs(area): descrizione breve
test(area): descrizione breve
chore: descrizione breve
refactor(area): descrizione breve
```

Le regole ArchUnit e di logging si applicano automaticamente in base ai
file che tocchi — non serve consultarle manualmente.

## Step 4 — Verifica locale (a cura dell'utente)

**Non eseguire tu i comandi di verifica.** Fermati qui e chiedi all'utente
di lanciare nel proprio terminale:

```bash
cd backend && mvn -B verify
```
```bash
cd frontend && npm run build && npm run lint
```

- Se l'utente riporta "verify ok" (o equivalente) → procedi allo Step 5,
  senza rieseguire nulla.
- Se l'utente incolla un errore → lavora **solo** su quell'errore specifico
  (non chiedere né eseguire il log completo). Se è una violazione ArchUnit,
  indica la regola violata e il motivo (CWE), correggi, e chiedi
  all'utente di rilanciare la verifica.
- Non lanciare tu stesso `mvn verify` o `npm run build` a scopo esplorativo
  "per controllare": è un costo evitabile, lo fa già l'utente.

## Step 5 — Chiedi conferma, poi commit, push e PR

Mostra un riepilogo sintetico (file toccati, test aggiunti) e **chiedi
conferma esplicita una sola volta** per l'intera sequenza commit → push →
apertura PR. Dopo la conferma, esegui tutto senza ulteriori pause:

- Titolo PR: `[ISSUE-<numero>] Descrizione breve`
- Template da `docs/BRANCHING_STRATEGY.md`
- Almeno 1 reviewer, label `backend`/`frontend`

## Step 6 — Merge e pulizia (dopo approvazione umana della PR)

- Merge con **Squash + Merge**
- Elimina branch remoto
- Pulizia locale: `git checkout main && git pull origin main && git branch -d <nome-branch>`
- Chiudi la issue solo dopo merge approvato
