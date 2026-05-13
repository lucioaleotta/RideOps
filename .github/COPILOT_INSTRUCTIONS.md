# Copilot Instructions — RideOps

Queste istruzioni sono attive per ogni sessione Copilot su questo repository.
Seguile sempre, senza aspettare che ti venga ricordato.

---

## 1. Workflow per ogni nuova issue

Prima di scrivere codice, esegui questi step nell'ordine.

### Step 1 — Crea la issue su GitHub

Ogni unità di lavoro deve avere una issue. Se non esiste, creala con:
- Titolo descrittivo in inglese
- Label appropriata: `backend`, `frontend`, `docs`, `chore`, `security`
- Assegnata al developer che la prende in carico, in questo caso sei tu lo sviluppatore, ti chiami AssitenteOne

### Step 2 — Crea il branch da `main`

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

### Step 3 — Sviluppo locale

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

### Step 4 — Verifica locale prima del push

**Backend:**
```bash
cd backend && mvn -B verify
```

**Frontend:**
```bash
cd frontend && npm run build && npm run lint
```

Non fare push se uno dei due fallisce.

### Step 5 — Apri la Pull Request

- Titolo: `[ISSUE-<numero>] Descrizione breve`
- Usa il template PR standard (vedi `BRANCHING_STRATEGY.md`)
- Assegna almeno 1 reviewer
- Label: `backend`, `frontend`, o entrambi
- Attendi CI verde prima di chiedere review

### Step 6 — Merge e pulizia

- Merge con **Squash + Merge** (mai merge commit, mai rebase)
- Elimina il branch remoto dopo il merge
- Pulizia locale:
```bash
git checkout main && git pull origin main
git branch -d <nome-branch>
```

---

## 2. Regole di architettura — ArchUnit (obbligatorie)

Queste regole sono verificate automaticamente da `SecurityArchitectureRules.java`
durante `mvn verify`. Il codice che le viola non può essere mergiato.

### Layer e dipendenze consentite

```
Controllers  →  Services  →  Repositories
                          →  Domain
Config       →  (tutto)
```

| Da \ Verso     | Controllers | Services | Repositories | Domain | Config |
|----------------|-------------|----------|--------------|--------|--------|
| Controllers    | —           | ✅        | ❌            | ❌      | ✅      |
| Services       | ❌           | —        | ✅            | ✅      | ✅      |
| Repositories   | ❌           | ❌        | —            | ✅      | ❌      |
| Domain         | ❌           | ❌        | ❌            | —      | ❌      |

### Regole specifiche

**Sicurezza crittografica**
- ❌ Vietato `MessageDigest.getInstance("MD5")` — usare SHA-256 o superiore (CWE-327)
- ❌ Vietato `Math.random()` per valori crittografici — usare `SecureRandom` (CWE-338)
- ❌ Vietato `java.util.Random` nel layer `application` — usare `SecureRandom` (CWE-338)

**Accesso ai dati**
- ❌ I controller non possono dipendere da classi repository (CWE-284)
- ❌ `TenantRepository` accessibile solo dal modulo `com.rideops.multitenancy` (CWE-284)

**Autorizzazione**
- ✅ Ogni `@RestController` (eccetto `AuthController` e `RoleAccessController`) deve avere `@PreAuthorize` (CWE-284 / OWASP A01)

**JWT**
- ❌ `JwtService` non può essere iniettato in controller, repository o domain — solo in config/security e nel proprio package (CWE-522)

**Domain purity**
- ❌ Le classi `domain` non possono dipendere da `jakarta.servlet`, `org.springframework.web` o `org.springframework.security` (Clean Architecture)

**Qualità del codice**
- ❌ Vietato `System.out`, `System.err`, `printStackTrace` — usare il logger strutturato (CWE-532)
- ❌ Vietato lanciare `Exception` o `RuntimeException` generiche — usare `ResponseStatusException` o eccezioni di dominio (CWE-209)

---

## 3. Standard di logging

### Formato

Ogni riga di log è un oggetto JSON con questi campi obbligatori:

```json
{
  "timestamp": "2025-01-15T10:23:41.123Z",
  "level": "INFO",
  "traceId": "abc-123-xyz",
  "service": "vehicle-service",
  "action": "vehicle.location.update",
  "message": "Posizione aggiornata con successo",
  "durationMs": 42,
  "outcome": "success"
}
```

### Livelli

| Livello | Quando usarlo                                             |
|---------|-----------------------------------------------------------|
| `DEBUG` | Solo in sviluppo, mai in produzione                       |
| `INFO`  | Flusso normale, eventi rilevanti (avvio, request, azioni) |
| `WARN`  | Anomalie gestite, degradi non bloccanti                   |
| `ERROR` | Errori che impattano l'utente o il sistema                |

### Cosa loggare (e cosa no)

**Loggare:**
- Avvio e spegnimento del servizio
- Ogni request HTTP: metodo, path, statusCode, durationMs
- Chiamate a sistemi esterni: inizio, esito, durata
- Errori non gestiti (stack trace solo in DEBUG/DEV)
- Passaggi critici di business: autenticazione, creazione ordine, ecc.

**Non loggare mai:**
- Body delle request o response
- Header `Authorization`
- Dati in chiaro coperti da PCI DSS (vedi sezione sotto)

### Offuscamento PCI DSS obbligatorio

Usa sempre `sanitizeForLog()` prima di loggare qualsiasi oggetto.
Non delegare l'offuscamento ai singoli sviluppatori.

| Tipo di dato              | Regola                                      |
|---------------------------|---------------------------------------------|
| Numero carta di credito   | Solo ultime 4 cifre: `****-****-****-1234`  |
| CVV / CVC                 | Sempre `****`                               |
| Scadenza carta            | Sempre `**/**`                              |
| IBAN / conto bancario     | Solo ultime 4 cifre: `****1234`             |
| Password / token / chiavi | Sempre `[REDACTED]`                         |
| PAN completo              | Non loggare mai, nemmeno parzialmente        |
| Nome titolare carta       | Offuscare: `M*** R***`                      |
| Email (PII)               | Offuscare: `m***@dominio.com`               |
| Telefono (PII)            | Offuscare: `****567`                        |

---

## 4. Modalità agente — regole di esecuzione

Quando operi in modalità agente (esegui comandi, scrivi file, interagisci con GitHub), segui questo protocollo preciso.

### Sequenza obbligatoria per ogni nuova feature

```
1. Ricevi la descrizione della feature
2. Crea la issue su GitHub (titolo, label, assegnazione)
3. Crea il branch da main con nomenclatura corretta
4. Sviluppa il codice rispettando ArchUnit e logging
5. Esegui la verifica locale (vedi sotto)  ← NON saltare
6. Se verde: chiedi conferma per commit e push
7. Dopo conferma: commit → push → crea PR → collega issue
8. Chiudi la issue solo dopo merge approvato
```

### Verifica obbligatoria prima di proporre commit

**Non proporre mai commit senza aver eseguito entrambi i comandi:**

```bash
cd backend && mvn -B verify
```
```bash
cd frontend && npm run build && npm run lint
```

Mostra l'output completo all'utente. Procedi con il commit **solo se entrambi sono verdi**.

Se `mvn -B verify` fallisce per una violazione ArchUnit:
- Mostra la regola violata e il motivo (CWE reference)
- Correggi il codice
- Riesegui la verifica prima di riproporre il commit

### Comunicazione con l'utente

- Prima del commit: mostra un riepilogo delle modifiche (file toccati, test aggiunti)
- Prima della PR: mostra titolo, descrizione e checklist compilata
- Non procedere mai a push o PR senza conferma esplicita dell'utente

---

## 5. Checklist pre-PR

Prima di aprire una PR, verifica mentalmente ogni punto:

- [ ] Branch creato da `main` con nomenclatura corretta
- [ ] Commit con Conventional Commits
- [ ] `mvn -B verify` verde in locale (include ArchUnit)
- [ ] `npm run build && npm run lint` verde in locale
- [ ] Nessun `System.out` / `printStackTrace` nel codice nuovo
- [ ] Log strutturati con `sanitizeForLog()` dove necessario
- [ ] `@PreAuthorize` presente sui controller nuovi
- [ ] Nessuna dipendenza layer vietata introdotta
- [ ] PR title nel formato `[ISSUE-XXX] Descrizione`
- [ ] Issue collegata alla PR

---

## 6. Riferimenti

- Strategia di branching completa: `docs/BRANCHING_STRATEGY.md`
- Regole ArchUnit: `src/test/java/com/rideops/architecture/SecurityArchitectureRules.java`
- Pipeline CI/CD: `docs/CI_CD_IMPLEMENTATION.md`
- Security review: `docs/SECURITY_REVIEW.md`
