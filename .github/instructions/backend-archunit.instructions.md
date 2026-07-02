---
applyTo: "backend/**/*.java"
---

# Regole di architettura — ArchUnit (obbligatorie)

Queste regole sono verificate automaticamente da `SecurityArchitectureRules.java`
durante `mvn verify`. Il codice che le viola non può essere mergiato.

## Layer e dipendenze consentite

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

## Regole specifiche

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

## Se `mvn -B verify` fallisce per una violazione ArchUnit

1. Mostra la regola violata e il motivo (riferimento CWE)
2. Correggi il codice
3. Riesegui la verifica prima di riproporre il commit
