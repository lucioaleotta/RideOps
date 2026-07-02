---
applyTo: "frontend/**/*.{ts,tsx}"
---

# Convenzioni frontend

## Verifica locale obbligatoria prima del push

```bash
cd frontend && npm run build && npm run lint
```

Non proporre commit se questo comando fallisce. Mostra sempre l'output
completo all'utente prima di procedere.

## Note

Aggiungi qui, man mano, le convenzioni specifiche del frontend (naming,
struttura componenti, gestione stato, ecc.) — tenendo il file scoped solo
a `frontend/**`, così non pesa mai sulle richieste che toccano il backend.
