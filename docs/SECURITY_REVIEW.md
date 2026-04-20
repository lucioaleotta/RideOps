# Security Review — RideOps Full-Stack

**Data:** 15 aprile 2026  
**Branch:** `fix/security-code-hardening`  
**Commit:** `3972776`  
**Revisore:** Senior Application Security Engineer  
**Scope:** Backend (Spring Boot 3.3.8 / Java 21), Frontend (Next.js 14), Nginx, Docker, CI/CD  
**Metodologia:** OWASP Top 10 (2021), CWE, CVSS v3.1

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Metodologia](#metodologia)
3. [Superficie d'attacco analizzata](#superficie-dattacco-analizzata)
4. [Finding #1 — Cookie `secure:false` e `sameSite:lax`](#finding-1--cookie-securefalse-e-samesitelax)
5. [Finding #2 — Token di reset e email in chiaro nei log](#finding-2--token-di-reset-e-email-in-chiaro-nei-log)
6. [Finding #3 — JWT senza validazione `iss`/`aud`](#finding-3--jwt-senza-validazione-issaud)
7. [Finding #4 — `toBase64()` double-encoding mascherava chiavi deboli](#finding-4--tobase64-double-encoding-mascherava-chiavi-deboli)
8. [Finding #5 — BCrypt cost factor 10 (sotto soglia OWASP)](#finding-5--bcrypt-cost-factor-10-sotto-soglia-owasp)
9. [Finding #6 — `LocalDate.parse()` non guardato nel journal endpoint](#finding-6--localdateparse-non-guardato-nel-journal-endpoint)
10. [Finding #7 — Nginx privo di `Content-Security-Policy`](#finding-7--nginx-privo-di-content-security-policy)
11. [Finding #8 — Frontend Docker container in esecuzione come root](#finding-8--frontend-docker-container-in-esecuzione-come-root)
12. [Finding #9 — Segreti hardcoded con fallback deboli in `application.yml`](#finding-9--segreti-hardcoded-con-fallback-deboli-in-applicationyml)
13. [Finding #10 — SSH come root nel pipeline CI/CD (nota infra)](#finding-10--ssh-come-root-nel-pipeline-cicd-nota-infra)
14. [ArchUnit — Regression Rules](#archunit--regression-rules)
15. [Riepilogo Rischi e Priorità](#riepilogo-rischi-e-priorità)
16. [Checklist Fix Implementati](#checklist-fix-implementati)
17. [Raccomandazioni Future](#raccomandazioni-future)

---

## Executive Summary

L'analisi ha coperto l'intero stack RideOps: autenticazione JWT, gestione sessioni cookie, logging, crittografia, configurazione infrastruttura e architettura del codice. Sono stati identificati **10 finding**, di cui **1 critico**, **3 ad alto rischio** e **6 a medio rischio**. Nessun finding basso.

Tutti i finding sono stati corretti nel commit `3972776` sul branch `fix/security-code-hardening`, ad eccezione del Finding #10 (infrastruttura VPS, richiede accesso al server).

Sono state introdotte **9 ArchUnit fitness function** per prevenire regressioni future sulle classi di vulnerabilità più critiche.

| Severità | Totale | Risolti |
|----------|--------|---------|
| Critico (CVSS ≥ 9.0) | 1 | 1 ✅ |
| Alto (CVSS 7.0–8.9) | 3 | 2 ✅ + 1 infra ⚠️ |
| Medio (CVSS 4.0–6.9) | 6 | 6 ✅ |

---

## Metodologia

- Lettura statica di tutti i file rilevanti per la sicurezza (20+ file)
- Analisi delle dipendenze (`pom.xml`, `package.json`)
- Review della configurazione infrastruttura (Nginx, Docker Compose, Dockerfile)
- Analisi del pipeline CI/CD (GitHub Actions)
- Classificazione per CWE e OWASP Top 10 (2021)
- Scoring CVSS v3.1 per ogni finding
- Produzione di fix con spiegazione del trade-off
- Creazione di ArchUnit regression test

---

## Superficie d'attacco analizzata

| File / Componente | Area di rischio |
|---|---|
| `frontend/app/api/auth/login/route.ts` | Gestione cookie JWT |
| `frontend/middleware.ts` | Autorizzazione client-side |
| `frontend/lib/jwt.ts` | Decode JWT lato client |
| `frontend/Dockerfile` | Privilegio container |
| `backend/.../JwtService.java` | Generazione e validazione token |
| `backend/.../JwtAuthenticationFilter.java` | Estrazione token da header |
| `backend/.../SecurityConfig.java` | Configurazione Spring Security |
| `backend/.../AuthController.java` | Endpoint login/logout/reset |
| `backend/.../PasswordResetService.java` | Flusso reset password |
| `backend/.../AdminUserController.java` | API amministrativa |
| `backend/.../GlobalExceptionHandler.java` | Gestione errori |
| `backend/.../AdminSeedConfig.java` | Seed credenziali admin |
| `backend/src/main/resources/application.yml` | Configurazione e segreti |
| `nginx/conf.d/rideops.conf` | Header HTTP di sicurezza |
| `docker-compose.prod.yml` | Isolamento reti container |
| `.github/workflows/deploy-hetzner.yml` | Pipeline CI/CD |

---

## Finding #1 — Cookie `secure:false` e `sameSite:lax`

**CWE:** CWE-614 (Sensitive Cookie Without 'Secure' Attribute)  
**OWASP:** A02:2021 — Cryptographic Failures  
**CVSS v3.1:** `AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:N` → **7.4 (High)**

### Descrizione

In `frontend/app/api/auth/login/route.ts` i cookie `access_token` e `user_role` venivano impostati con `secure: false` e `sameSite: 'lax'` in tutti gli ambienti.

```typescript
// PRIMA — vulnerabile
cookies().set('access_token', token, {
  httpOnly: true,
  secure: false,       // ← token trasmesso in chiaro su HTTP
  sameSite: 'lax',     // ← protezione CSRF insufficiente
  maxAge: 60 * 60,
  path: '/',
});
```

### Impatto

- Con `secure: false` il token JWT viene trasmesso in chiaro su connessioni HTTP. Un attaccante nella stessa rete (es. Wi-Fi pubblico) può intercettarlo (session hijacking).
- Con `sameSite: 'lax'` le richieste cross-site di tipo GET con navigazione top-level includono il cookie, ampliando la superficie CSRF rispetto a `strict`.

### Scenario d'attacco

1. Vittima accede a `http://rideops.it` (redirect non ancora seguito)
2. Attaccante esegue un attacco MITM (ARP spoofing su LAN)
3. Intercetta il cookie `access_token` nella request HTTP
4. Utilizza il token per impersonare la vittima → accesso completo all'account

### Fix applicato

```typescript
// DOPO — corretto
const isProduction = process.env.NODE_ENV === 'production';

cookies().set('access_token', token, {
  httpOnly: true,
  secure: isProduction,  // true in prod, false solo in dev locale
  sameSite: 'strict',    // nessuna richiesta cross-site include il cookie
  maxAge: 60 * 60,
  path: '/',
});
```

**File:** [frontend/app/api/auth/login/route.ts](../frontend/app/api/auth/login/route.ts)

---

## Finding #2 — Token di reset e email in chiaro nei log

**CWE:** CWE-532 (Insertion of Sensitive Information into Log File) + CWE-117 (Improper Output Neutralization for Logs)  
**OWASP:** A09:2021 — Security Logging and Monitoring Failures  
**CVSS v3.1:** `AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` → **6.5 (Medium)**

### Descrizione

`PasswordResetService.java` loggava a livello INFO sia l'indirizzo email dell'utente (dati personali, GDPR) sia il token di reset completo come parte del link.

```java
// PRIMA — vulnerabile
LOGGER.info("Password reset requested for {}. Stub link: {}", 
    user.getEmail(),   // ← PII in log
    resetPath);        // ← token di reset in chiaro nel log
```

### Impatto

- **CWE-532:** Il token è un segreto a singolo uso equivalente a una password temporanea. Chiunque abbia accesso ai log (sviluppatori, sistemi di log aggregation, SIEM) può resettare l'account della vittima.
- **CWE-117:** `user.getEmail()` è un valore controllato dall'utente. Se contiene sequenze CRLF (`\r\n`) può iniettare righe false nel log (log forging), alterando audit trail.
- Violazione GDPR Art. 32 (logging PII senza necessità).

### Scenario d'attacco

1. Attaccante ottiene accesso in lettura ai log (es. accesso al sistema di log centralizzato, dump log da un path traversal)
2. Cerca righe `Password reset requested`
3. Estrae il token dal link e accede all'account della vittima prima che venga usato

### Fix applicato

```java
// DOPO — corretto
LOGGER.info("Password reset token generated for userId={}", user.getId());
```

**File:** [backend/src/main/java/com/rideops/identity/application/PasswordResetService.java](../backend/src/main/java/com/rideops/identity/application/PasswordResetService.java)

---

## Finding #3 — JWT senza validazione `iss`/`aud`

**CWE:** CWE-347 (Improper Verification of Cryptographic Signature)  
**OWASP:** A02:2021 — Cryptographic Failures  
**CVSS v3.1:** `AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N` → **7.5 (High)**

### Descrizione

`JwtService.java` non impostava né validava i claim `iss` (issuer) e `aud` (audience) nel token JWT. La validazione si limitava a firma e scadenza.

```java
// PRIMA — vulnerabile (generateToken)
return Jwts.builder()
    .subject(userDetails.getUsername())
    // nessun .issuer() né .audience()
    .claim("uid", userDetails.getId())
    ...

// PRIMA — vulnerabile (isTokenValid)
// nessun controllo su claims.getIssuer() né claims.getAudience()
return subject != null && subject.equalsIgnoreCase(userDetails.getUsername())
    && tenantMatches
    && expiration != null && expiration.after(new Date());
```

### Impatto

Senza validazione di `iss` e `aud`:
- Un token JWT valido emesso da **un'altra applicazione** che condivide lo stesso segreto HMAC (o che usa una chiave compromessa) può essere accettato da RideOps.
- In ambienti multi-servizio, un token destinato a un microservizio diverso può essere riutilizzato per autenticarsi su RideOps (**token confusion / confused deputy**).

### Scenario d'attacco

1. Ambiente con più servizi che condividono lo stesso `JWT_SECRET` (errore di configurazione comune)
2. Attaccante ottiene un token valido emesso dal servizio B (con scope limitato)
3. Presenta il token a RideOps: firma valida, scadenza non passata → accesso autorizzato
4. Bypassa il sistema RBAC perché RideOps non verifica che il token fosse destinato a sé

### Fix applicato

```java
// DOPO — corretto
private static final String ISSUER = "rideops";
private static final String AUDIENCE = "rideops-api";

// generateToken: aggiunta issuer e audience
return Jwts.builder()
    .subject(userDetails.getUsername())
    .issuer(ISSUER)
    .audience().add(AUDIENCE).and()
    ...

// isTokenValid: aggiunta validazione
String issuer = claims.getIssuer();
if (!ISSUER.equals(issuer)) return false;

Set<String> audience = claims.getAudience();
if (audience == null || !audience.contains(AUDIENCE)) return false;
```

**File:** [backend/src/main/java/com/rideops/identity/application/JwtService.java](../backend/src/main/java/com/rideops/identity/application/JwtService.java)

---

## Finding #4 — `toBase64()` double-encoding mascherava chiavi deboli

**CWE:** CWE-326 (Inadequate Encryption Strength)  
**OWASP:** A02:2021 — Cryptographic Failures  
**CVSS v3.1:** `AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N` → **5.9 (Medium)**

### Descrizione

`JwtService.java` conteneva un metodo privato `toBase64()` che veniva usato nel costruttore per derivare la chiave HMAC:

```java
// PRIMA — antipattern
this.secretKey = Keys.hmacShaKeyFor(
    Decoders.BASE64.decode(toBase64(secret))
);

private String toBase64(String secret) {
    return Base64.getEncoder().encodeToString(
        secret.getBytes(StandardCharsets.UTF_8)
    );
}
```

**Analisi del flusso:**  
`secret` (stringa da env) → `toBase64()` → Base64 della stringa → `BASE64.decode()` → bytes UTF-8 originali → chiave HMAC

Il double-encoding è un no-op: il risultato finale è `secret.getBytes(UTF_8)`. Questo ha due conseguenze:
1. La chiave non deve essere una stringa Base64 valida → il requisito di entropia è mascherato.
2. Una chiave debole come `mysecret` viene accettata silenziosamente anziché fallire al boot.

### Impatto

Con HMAC-SHA256 la chiave deve avere almeno 256 bit di entropia reale. Un segreto corto o derivato da parole (es. `change-this-secret-2026`) ha entropia reale molto inferiore → attacco brute-force offline fattibile dopo aver catturato un token JWT.

### Fix applicato

```java
// DOPO — corretto
// Il costruttore si aspetta una stringa Base64 di 32+ byte realmente casuali.
// Generare con: openssl rand -base64 32
this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
// toBase64() rimosso
```

Il metodo `toBase64()` è stato rimosso. `JWT_SECRET` deve ora essere prodotto con `openssl rand -base64 32` e non accetta più fallback deboli (vedi Finding #9).

**File:** [backend/src/main/java/com/rideops/identity/application/JwtService.java](../backend/src/main/java/com/rideops/identity/application/JwtService.java)

---

## Finding #5 — BCrypt cost factor 10 (sotto soglia OWASP)

**CWE:** CWE-916 (Use of Password Hash With Insufficient Computational Effort)  
**OWASP:** A02:2021 — Cryptographic Failures  
**CVSS v3.1:** `AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N` → **5.3 (Medium)**

### Descrizione

`SecurityConfig.java` usava il costruttore di default di `BCryptPasswordEncoder`, che imposta un cost factor di **10**.

```java
// PRIMA — sotto soglia
@Bean
PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();  // cost = 10 (default)
}
```

### Impatto

OWASP Password Storage Cheat Sheet (2024) raccomanda **cost ≥ 12** per BCrypt su hardware moderno (server cloud 2024+). Con cost=10, una GPU RTX 4090 può testare ~100k hash/s; con cost=12 scende a ~25k hash/s. In caso di data breach del database, il tempo di cracking offline si quadruplica.

### Fix applicato

```java
// DOPO — corretto
@Bean
PasswordEncoder passwordEncoder() {
    // cost = 12: ~300ms/login su hardware standard (accettabile per UX)
    return new BCryptPasswordEncoder(12);
}
```

**Trade-off:** Il login richiederà ~300ms invece di ~100ms. Per un'applicazione gestionale con utenti limitati è del tutto accettabile. Non impatta le API non-autenticazione.

**File:** [backend/src/main/java/com/rideops/config/SecurityConfig.java](../backend/src/main/java/com/rideops/config/SecurityConfig.java)

---

## Finding #6 — `LocalDate.parse()` non guardato nel journal endpoint

**CWE:** CWE-755 (Improper Handling of Exceptional Conditions)  
**OWASP:** A05:2021 — Security Misconfiguration  
**CVSS v3.1:** `AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:L` → **5.3 (Medium)**

### Descrizione

`AdminUserController.java`, nel metodo `listJournal()`, mancavano le annotazioni `@RequestParam` sui parametri e non gestiva `DateTimeParseException`:

```java
// PRIMA — vulnerabile
@GetMapping("/journal")
public List<UserAdminAuditLogDto> listJournal(String date, String adminUserId) {
    LocalDate dateFilter = null;
    if (date != null && !date.isBlank()) {
        dateFilter = LocalDate.parse(date.trim());  // ← DateTimeParseException non gestita
    }
    return listUserAdminAuditLogUseCase.execute(dateFilter, adminUserId);
}
```

### Impatto

1. Un valore `date` malformato (es. `"not-a-date"` o stringa molto lunga) genera una `DateTimeParseException` non catchata.
2. Il `GlobalExceptionHandler` gestisce solo `IllegalStateException`, quindi questa eccezione risale come HTTP 500.
3. Nell'environment di sviluppo (o se mal configurato in prod) Spring include lo stack trace nella risposta → information disclosure (CWE-209).
4. Senza `@RequestParam` Spring non bindina i parametri da query string correttamente in alcuni contesti.

### Fix applicato

```java
// DOPO — corretto
@GetMapping("/journal")
public List<UserAdminAuditLogDto> listJournal(
        @RequestParam(required = false) String date,
        @RequestParam(required = false) String adminUserId) {
    LocalDate dateFilter = null;
    if (date != null && !date.isBlank()) {
        try {
            dateFilter = LocalDate.parse(date.trim());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Formato data non valido, usare YYYY-MM-DD");
        }
    }
    return listUserAdminAuditLogUseCase.execute(dateFilter, adminUserId);
}
```

**File:** [backend/src/main/java/com/rideops/identity/adapters/in/AdminUserController.java](../backend/src/main/java/com/rideops/identity/adapters/in/AdminUserController.java)

---

## Finding #7 — Nginx privo di `Content-Security-Policy`

**CWE:** CWE-116 (Improper Encoding or Escaping of Output) / Missing CSP  
**OWASP:** A03:2021 — Injection  
**CVSS v3.1:** `AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N` → **6.1 (Medium)**

### Descrizione

`nginx/conf.d/rideops.conf` aveva correttamente HSTS, `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy`, ma mancava il header `Content-Security-Policy`.

```nginx
# PRIMA — mancante CSP
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options    "nosniff" always;
add_header X-Frame-Options           "SAMEORIGIN" always;
add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
# nessun Content-Security-Policy
```

### Impatto

Senza CSP, se un attaccante riesce a iniettare codice JavaScript nella pagina (XSS via un campo non sanitizzato, dipendenza compromessa o DOM injection), il browser esegue il codice senza restrizioni:
- Esfiltrazione del cookie (se non `httpOnly`) o dati dalla pagina
- Reindirizzamento a phishing
- Esecuzione di richieste autenticate (CSRF amplificato)

### Fix applicato

```nginx
# DOPO — CSP aggiunto
add_header Content-Security-Policy
  "default-src 'self';
   script-src 'self';
   style-src 'self' 'unsafe-inline';
   img-src 'self' data: blob:;
   font-src 'self';
   connect-src 'self';
   frame-ancestors 'none';
   base-uri 'self';
   form-action 'self';" always;
```

**Note sul trade-off:**  
`style-src 'unsafe-inline'` è necessario perché Tailwind CSS inietta stili inline in alcune versioni. In alternativa si può usare un nonce generato lato server. `frame-ancestors 'none'` sostituisce e rafforza `X-Frame-Options: SAMEORIGIN`.

**File:** [nginx/conf.d/rideops.conf](../nginx/conf.d/rideops.conf)

---

## Finding #8 — Frontend Docker container in esecuzione come root

**CWE:** CWE-250 (Execution with Unnecessary Privileges)  
**OWASP:** A05:2021 — Security Misconfiguration  
**CVSS v3.1:** `AV:L/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:N` → **4.4 (Medium)**

### Descrizione

Il `frontend/Dockerfile` non conteneva una direttiva `USER`, quindi il processo Node.js veniva eseguito come `root` nel container.

```dockerfile
# PRIMA — esecuzione come root
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]   # ← root
```

Il `backend/Dockerfile` aveva già correttamente un utente `rideops` non privilegiato.

### Impatto

Se un attaccante ottiene RCE nel processo Next.js (es. via dipendenza compromessa, prototype pollution), l'esecuzione come root all'interno del container amplifica l'impatto:
- Accesso in scrittura a tutti i file del filesystem del container
- Capacità di montare filesystem dell'host se il container ha `--privileged` o volume mal configurato
- Pivot verso altri container nella stessa rete Docker

### Fix applicato

```dockerfile
# DOPO — utente non privilegiato
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**File:** [frontend/Dockerfile](../frontend/Dockerfile)

---

## Finding #9 — Segreti hardcoded con fallback deboli in `application.yml`

**CWE:** CWE-798 (Use of Hard-coded Credentials)  
**OWASP:** A07:2021 — Identification and Authentication Failures  
**CVSS v3.1:** `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` → **9.1 (Critical)**

### Descrizione

`application.yml` definiva valori di fallback per le variabili d'ambiente critiche:

```yaml
# PRIMA — vulnerabile
security:
  jwt:
    secret: ${JWT_SECRET:change-this-secret-change-this-secret-2026}

rideops:
  security:
    admin:
      password: ${ADMIN_PASSWORD:ChangeMe123!}
```

### Impatto

**Questo è il finding più critico.** Se l'environment di produzione non imposta `JWT_SECRET` o `ADMIN_PASSWORD`, l'applicazione si avvia senza errori usando le credenziali di default, che sono:
- Pubblicamente visibili nel repository (chiunque abbia accesso al codice le conosce)
- Deterministiche → un attaccante può firmare token JWT arbitrari con qualsiasi `sub` e `role`
- Permettono l'accesso immediato come admin all'applicazione

Il fallback `ChangeMe123!` è anche una password estremamente comune nei dizionari di attacco.

### Scenario d'attacco

1. Nuovo deployment su un server che non ha configurato le variabili d'ambiente
2. Spring Boot si avvia normalmente (nessun errore)
3. Attaccante conosce il segreto dal repository → forgia un token JWT con `role: ADMIN`
4. Accesso completo all'API amministrativa

### Fix applicato

```yaml
# DOPO — fail-fast se le variabili non sono impostate
security:
  jwt:
    # SECURITY: JWT_SECRET deve essere generato con: openssl rand -base64 32
    # L'applicazione non si avvia se questa variabile non è impostata.
    secret: ${JWT_SECRET}

rideops:
  security:
    admin:
      # SECURITY: nessun default. Fail-fast al boot se ADMIN_PASSWORD non è impostata.
      password: ${ADMIN_PASSWORD}
```

Spring Boot lancerà `IllegalArgumentException` al boot se le variabili non sono presenti nell'ambiente, rendendo impossibile avviare accidentalmente con credenziali deboli.

**File:** [backend/src/main/resources/application.yml](../backend/src/main/resources/application.yml)

> **Nota operativa:** Aggiornare `.env.example` e `QUICKSTART.md` per documentare la generazione delle variabili obbligatorie:
> ```bash
> JWT_SECRET=$(openssl rand -base64 32)
> ADMIN_PASSWORD=$(openssl rand -base64 16)
> ```

---

## Finding #10 — SSH come root nel pipeline CI/CD (nota infra)

**CWE:** CWE-250 (Execution with Unnecessary Privileges)  
**OWASP:** A05:2021 — Security Misconfiguration  
**CVSS v3.1:** `AV:N/AC:H/PR:H/UI:N/S:C/C:H/I:H/A:H` → **7.2 (High)**

### Descrizione

`.github/workflows/deploy-hetzner.yml` si connette al VPS Hetzner come utente `root`:

```yaml
- name: Deploy via SSH
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: root          # ← privilegio massimo
    key: ${{ secrets.SSH_PRIVATE_KEY }}
```

### Impatto

Se il secret `SSH_PRIVATE_KEY` viene compromesso (leak in log, fork malevolo di PR, supply chain attack sull'action `appleboy/ssh-action`):
- Accesso root completo al VPS
- Possibilità di esfiltrare certificati TLS, dump database, chiavi SSH di altri utenti
- Persistenza tramite backdoor
- Distruzione dell'infrastruttura

### Raccomandazione (richiede accesso al VPS — non corretto in questo PR)

1. Creare un utente dedicato `deploy` sul VPS:
   ```bash
   useradd -m -s /bin/bash deploy
   usermod -aG docker deploy
   echo "deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker compose" >> /etc/sudoers.d/deploy
   ```
2. Generare una chiave SSH dedicata per il deploy:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key
   ```
3. Aggiornare il secret `SSH_USER` nel repository GitHub da `root` a `deploy`
4. Disabilitare il login SSH per root: `PermitRootLogin no` in `/etc/ssh/sshd_config`

---

## ArchUnit — Regression Rules

È stato aggiunto il file [backend/src/test/java/com/rideops/architecture/SecurityArchitectureRules.java](../backend/src/test/java/com/rideops/architecture/SecurityArchitectureRules.java) con 9 `@ArchTest` che verranno eseguiti automaticamente ad ogni `mvn test`.

ArchUnit `1.3.0` è stato aggiunto come dipendenza test in `pom.xml`.

| Regola ArchUnit | CWE/OWASP | Cosa previene |
|---|---|---|
| `no_md5_usage` | CWE-327 | `MessageDigest.getInstance("MD5")` nel codice applicativo |
| `no_math_random` | CWE-338 | `Math.random()` per generare valori crittografici |
| `no_util_random_in_security_contexts` | CWE-338 | `java.util.Random` nel service layer |
| `controllers_must_not_access_repositories_directly` | CWE-284 | Bypass del service layer (RBAC, tenant isolation) |
| `controllers_must_be_annotated_with_PreAuthorize` | CWE-284 | Endpoint senza autorizzazione esplicita |
| `no_standard_streams` | CWE-532 | `System.out` / `printStackTrace` in produzione |
| `jwt_service_accessed_only_from_security_layer` | CWE-522 | JWT manipolato direttamente dai controller |
| `domain_must_not_depend_on_http_or_security` | Clean Arch | Domain layer contaminato da tipi infrastrutturali |
| `layered_architecture_security` | CWE-284 | Violazioni di layer che bypassano controlli sicurezza |

---

## Riepilogo Rischi e Priorità

| # | Titolo | CWE | OWASP | CVSS | Stato |
|---|--------|-----|-------|------|-------|
| 9 | Segreti hardcoded con fallback deboli | CWE-798 | A07 | **9.1 Critico** | ✅ Risolto |
| 3 | JWT senza validazione `iss`/`aud` | CWE-347 | A02 | **7.5 Alto** | ✅ Risolto |
| 1 | Cookie `secure:false` + `sameSite:lax` | CWE-614 | A02 | **7.4 Alto** | ✅ Risolto |
| 10 | SSH root nel pipeline CI/CD | CWE-250 | A05 | **7.2 Alto** | ⚠️ Infra |
| 2 | Token reset e email nei log | CWE-532+117 | A09 | **6.5 Medio** | ✅ Risolto |
| 7 | Nginx senza CSP | CWE-116 | A03 | **6.1 Medio** | ✅ Risolto |
| 4 | `toBase64()` double-encoding | CWE-326 | A02 | **5.9 Medio** | ✅ Risolto |
| 5 | BCrypt cost factor 10 | CWE-916 | A02 | **5.3 Medio** | ✅ Risolto |
| 6 | `LocalDate.parse()` non guardato | CWE-755 | A05 | **5.3 Medio** | ✅ Risolto |
| 8 | Frontend container come root | CWE-250 | A05 | **4.4 Medio** | ✅ Risolto |

---

## Checklist Fix Implementati

- [x] **Fix #1** — `frontend/app/api/auth/login/route.ts`: `secure: isProduction`, `sameSite: 'strict'`
- [x] **Fix #2** — `PasswordResetService.java`: log solo `userId`, rimossi email e token
- [x] **Fix #3** — `JwtService.java`: aggiunta generazione e validazione `iss` + `aud`
- [x] **Fix #4** — `JwtService.java`: rimosso `toBase64()`, chiave derivata direttamente da Base64
- [x] **Fix #5** — `SecurityConfig.java`: `BCryptPasswordEncoder(12)`
- [x] **Fix #6** — `AdminUserController.java`: `@RequestParam` + `catch DateTimeParseException` → `400 BAD_REQUEST`
- [x] **Fix #7** — `nginx/conf.d/rideops.conf`: aggiunto header `Content-Security-Policy`
- [x] **Fix #8** — `frontend/Dockerfile`: aggiunto utente `nextjs` non-root, `COPY --chown`, `USER nextjs`
- [x] **Fix #9** — `application.yml`: rimossi fallback `JWT_SECRET` e `ADMIN_PASSWORD`
- [x] **Arch** — `pom.xml`: aggiunto `archunit-junit5:1.3.0`
- [x] **Arch** — Creato `SecurityArchitectureRules.java` con 9 `@ArchTest`
- [ ] **Fix #10** — SSH deploy non-root (richiede accesso VPS Hetzner)

---

## Raccomandazioni Future

### Breve termine (prossimo sprint)

1. **Risolvere Finding #10**: creare utente `deploy` sul VPS, disabilitare `PermitRootLogin`.
2. **Rotation del JWT_SECRET**: generare un nuovo segreto con `openssl rand -base64 32` e ruotarlo in produzione. Gli utenti correntemente loggati saranno sloggati (comportamento atteso e corretto dopo una compromissione).
3. **Rotation della password admin**: cambiare `ADMIN_PASSWORD` in produzione.
4. **Completare `GlobalExceptionHandler`**: aggiungere un handler generico per `Exception` che restituisce `500` senza stack trace, e un handler per `MethodArgumentTypeMismatchException`.

### Medio termine

5. **Middleware frontend**: `middleware.ts` autorizza basandosi sul cookie `user_role` senza verifica della firma JWT. Spostare la logica di autorizzazione su un API route server-side o verificare il JWT con la chiave pubblica (per ECDSA) / endpoint di introspection.
6. **Rate limiting**: aggiungere rate limiting su `/api/auth/login` e `/api/auth/forgot-password` in Nginx (es. `limit_req_zone`) per prevenire brute force e account enumeration.
7. **Audit log**: implementare audit logging strutturato per login falliti, reset password, accessi amministrativi (la tabella `audits` esiste nello schema ma non sembra alimentata).
8. **Dependency scanning**: aggiungere `dependabot` o `trivy` nel pipeline CI per rilevare CVE nelle dipendenze automaticamente.
9. **Secret scanning**: abilitare GitHub Secret Scanning sul repository per prevenire commit accidentali di segreti.

### Lungo termine

10. **Migrare a ECDSA (ES256)**: HMAC-SHA256 richiede la stessa chiave per firmare e verificare. Con ES256 la chiave privata firma e quella pubblica verifica; il frontend può verificare localmente senza condividere il segreto.
11. **Refresh token**: implementare un meccanismo di refresh token a breve durata per ridurre la finestra di esposizione in caso di token compromise.
12. **SBOM**: generare un Software Bill of Materials (`cyclonedx-maven-plugin`) ad ogni release per tracciabilità delle dipendenze.

---

*Documento generato nel contesto della branch `fix/security-code-hardening` — RideOps Security Review, aprile 2026.*
