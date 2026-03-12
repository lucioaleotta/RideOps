# Strategia di Branching - RideOps

Questa è la strategia di branching consigliata per gestire in modo ordinato il monorepo.

## Principi di Base

✅ **Branch principale:** `main` (sempre deployment-ready)  
✅ **Nessun branch develop persistente** (semplifichiamo)  
✅ **Un branch = un'issue/feature** (tracciabilità)  
✅ **PR obbligatoria** (review + CI prima di merge)  
✅ **CI verde prima di merge** (backend test + frontend build)  

---

## Nomenclatura Branch

Usa quest pattern per mantenere ordine:

```
feature/ISSUE-123-descrizione-breve    # nuova feature
fix/ISSUE-456-descrizione-breve        # bug fix
docs/descrizione-breve                  # documentazione
chore/descrizione-breve                # manutenzione (deps, config, etc)
refactor/descrizione-breve             # refactoring
```

### Esempi Concreti

```bash
feature/ISSUE-12-add-vehicle-tracking
fix/ISSUE-45-logout-redirect-url
docs/testing-guide
chore/update-nextjs-version
refactor/simplify-middleware-auth
```

---

## Workflow Standard (per ogni issue)

### 1️⃣ Creazione Branch da MAIN

```bash
# Sempre da main, mai da develop
git checkout main
git pull origin main
git checkout -b feature/ISSUE-123-descrizione
```

### 2️⃣ Sviluppo Locale

```bash
# Committi small e descrittivi
git add .
git commit -m "feat(vehicle): add GPS tracking endpoint

- Implemented POST /vehicles/:id/location
- Added background job for polling
- Tests: +5 new test cases"
```

**Convention:** Usa [Conventional Commits](https://www.conventionalcommits.org/it/)
```
feat(area): descrizione breve      # feature
fix(area): descrizione breve       # bug fix
docs(area): descrizione breve      # documentazione
test(area): descrizione breve      # test
chore: descrizione breve           # manutenzione
refactor(area): descrizione breve  # refactoring
```

### 3️⃣ Verifica Locale (IMPORTANTE)

**Backend:**
```bash
cd backend
mvn -B verify
```

**Frontend:**
```bash
cd frontend
npm run build
npm run lint
```

### 4️⃣ Push su GitHub

```bash
git push -u origin feature/ISSUE-123-descrizione
```

### 5️⃣ Apri Pull Request

**Su GitHub (interfaccia web):**
- Titolo: `[ISSUE-123] Descrizione breve della feature`
- Descrizione: spiega cosa, perché, come (guarda template sotto)
- Assegna: te stesso
- Label: `backend`, `frontend`, o entrambi
- Attendi CI green ✅

### 6️⃣ Review e Merge

- Almeno **1 review** prima di merge (da collega o team lead)
- Merge con **Squash + Merge** (mantiene main pulito)
- Elimina il branch remoto dopo merge

```bash
# Dopo merge su GitHub, pulisci in locale:
git checkout main
git pull origin main
git branch -d feature/ISSUE-123-descrizione
```

---

## Template PR (copiaincolla in ogni PR)

```markdown
## Descrizione
[Spiega quale problema risolvi o feature aggiungi]

## Tipo di Cambio
- [ ] Feature
- [ ] Bug Fix
- [ ] Documentation

## Come Testare
1. Fai login con credenziali `admin` / `ChangeMe123!`
2. Naviga a ... 
3. Verifica che ...

## Checklist
- [ ] Codice revisonato personalmente
- [ ] Tests passano localmente (`mvn verify` o `npm run build`)
- [ ] Nessun errore console in browser
- [ ] Docker build OK (se impatta containers)
- [ ] Documentazione aggiornata (se necessari cambiamenti utente)

## Note
[Qualunque cosa voglia sapere il reviewer]
```

---

## Convergence Plan (Situazione Attuale 📋)

Attualmente avete:
- `main` (production)
- `develop` (intermedio)
- `feat/userid-auth-header` (aperto)
- `docs/testing-guide` (appena creato)
- `copilot/bootstrap-local-dev-integration` (remoto)

### Azioni Immediati

**1. Mergia feature branch aperti in main:**

```bash
# Per ogni branch aperto (feat/userid-auth-header, docs/testing-guide, ecc)
git checkout <branch>
git pull origin <branch>

# Verifica build
cd backend && mvn -B verify
cd frontend && npm run build

# Se OK, fai PR su GitHub e mergia con squash
```

**2. Elimina branch `develop` (non più necessario):**

```bash
git push origin --delete develop
git branch -D develop
```

**3. Puisci branch remoti stale:**

```bash
# Elimina branch remoti merged
git remote prune origin
```

**4. Configura protezione branch `main` su GitHub:**
   - Vai a: Settings → Branches → Add Rule
   - Pattern: `main`
   - ✅ Require a pull request before merging
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require branches to be up to date before merging
   - ✅ Require status checks to pass (backend CI)

---

## Comando Utility

Salva questi alias nel tuo `.zshrc` o `.bashrc`:

```bash
# alias per pulire branch locali non più necessari
alias git-clean-branches='git branch -vv | grep ": gone\]" | awk "{print \$1}" | xargs git branch -d'

# alias per vedere branch con ultimo commit
alias git-recent='git for-each-ref --sort=-committerdate --format="%(refname:short) (%(committerdate:short))" refs/heads | head -10'

# alias per fare checkout main e pull
alias git-main='git checkout main && git pull origin main'
```

---

## CI/CD Integration

Con questa strategia, GitHub Actions eseguirà:

**Su ogni PUSH a feature branch:**
```
✅ Backend: mvn verify
✅ Frontend: npm run build + lint
```

**Su ogni MERGE a main:**
```
✅ Backend: mvn verify
✅ Frontend: build + push to Artifact Registry
✅ Deploy to Cloud Run (revision incrementale)
```

---

## FAQ

**D: E se servono hotfix urgenti in prod?**  
R: Crea `hotfix/ISSUE-XXX-descrizione` da main, testa, apri PR emergency, mergia con review. Semplice.

**D: Chi decide quando mergiare?**  
R: Il team lead o collega che revisa. Almeno 1 review per PR.

**D: E se un branch rimane open troppo a lungo?**  
R: ❌ Male! Mantieni i branch piccoli e veloci (<3 giorni). Se pull diverge too much, rebasa su main.

**D: Usiamo Git Flow full?**  
R: No, troppo complesso. Trunk-based semplificato è sufficiente.

---

## Prossimi Step

1. ✅ Mergia i branch aperti in main (con squash)
2. ✅ Elimina `develop` da remoto
3. ✅ Configura protezione su GitHub (Settings → Branches)
4. ✅ Documenta questa strategia nel BRANCHING_STRATEGY.md (questo file!)
5. ✅ Condividi con il team

**Iniziamo subito? 🚀**
