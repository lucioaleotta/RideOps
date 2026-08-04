---
applyTo: "frontend/**/*.{ts,tsx}"
---

# Convenzioni frontend

## Verifica locale (a cura dell'utente)

```bash
cd frontend && npm run build && npm run lint
```

**Non eseguire tu questo comando a scopo esplorativo.** È l'utente a
lanciarlo nel proprio terminale. Interviene solo se ti viene riportato un
errore specifico: lavora su quello, non chiedere né generare l'intero log.

## Note

Aggiungi qui, man mano, le convenzioni specifiche del frontend (naming,
struttura componenti, gestione stato, ecc.) — tenendo il file scoped solo
a `frontend/**`, così non pesa mai sulle richieste che toccano il backend.
