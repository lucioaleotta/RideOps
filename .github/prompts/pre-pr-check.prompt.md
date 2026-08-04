---
name: 'Checklist pre-PR'
description: 'Verifica finale prima di aprire una Pull Request su RideOps.'
mode: agent
---

# Checklist pre-PR

Verifica ogni punto e mostra solo un riepilogo sintetico (✅/❌ per riga),
non output verbosi:

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

Se un punto non è verificabile automaticamente, chiedi conferma esplicita
all'utente prima di segnarlo come completato.
