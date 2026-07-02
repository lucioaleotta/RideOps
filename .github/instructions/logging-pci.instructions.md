---
applyTo: "backend/**/logging/**"
---

# Standard di logging

## Formato

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

## Livelli

| Livello | Quando usarlo                                             |
|---------|-----------------------------------------------------------|
| `DEBUG` | Solo in sviluppo, mai in produzione                       |
| `INFO`  | Flusso normale, eventi rilevanti (avvio, request, azioni) |
| `WARN`  | Anomalie gestite, degradi non bloccanti                   |
| `ERROR` | Errori che impattano l'utente o il sistema                |

## Cosa loggare (e cosa no)

**Loggare:**
- Avvio e spegnimento del servizio
- Ogni request HTTP: metodo, path, statusCode, durationMs
- Chiamate a sistemi esterni: inizio, esito, durata
- Errori non gestiti (stack trace solo in DEBUG/DEV)
- Passaggi critici di business: autenticazione, creazione ordine, ecc.

**Non loggare mai:**
- Body delle request o response
- Header `Authorization`
- Dati in chiaro coperti da PCI DSS (vedi tabella sotto)

## Offuscamento PCI DSS obbligatorio

Usa sempre `sanitizeForLog()` prima di loggare qualsiasi oggetto.
Non delegare l'offuscamento ai singoli sviluppatori.

| Tipo di dato              | Regola                                      |
|---------------------------|---------------------------------------------|
| Numero carta di credito   | Solo ultime 4 cifre: `****-****-****-1234`  |
| CVV / CVC                 | Sempre `****`                               |
| Scadenza carta            | Sempre `**/**`                              |
| IBAN / conto bancario     | Solo ultime 4 cifre: `****1234`             |
| Password / token / chiavi | Sempre `[REDACTED]`                         |
| PAN completo               | Non loggare mai, nemmeno parzialmente        |
| Nome titolare carta       | Offuscare: `M*** R***`                      |
| Email (PII)               | Offuscare: `m***@dominio.com`               |
| Telefono (PII)            | Offuscare: `****567`                        |
