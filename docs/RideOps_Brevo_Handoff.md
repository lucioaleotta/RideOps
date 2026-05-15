# RideOps — Handoff Integrazione Brevo (Spring Boot)

> Documento di consegna per GitHub Copilot. Implementare l'integrazione email con Brevo nel backend Spring Boot. **Nessuna logica email sul frontend.**

---

## 1. Overview

Il backend chiama l'API REST di Brevo passando l'ID del template e i parametri dinamici. I template HTML sono gestiti interamente su Brevo — il backend passa solo `templateId` + `params`, mai HTML inline.

---

## 2. Configurazione — `application.yml`

```yaml
brevo:
  api-key: ${BREVO_API_KEY}
  sender-email: ${BREVO_SENDER_EMAIL}
  sender-name: ${BREVO_SENDER_NAME}
  base-url: ${BREVO_BASE_URL}
```

### Variabili d'ambiente — `.env.prod` (sul server Hetzner, mai in git)

| Variabile | Valore |
|-----------|--------|
| `BREVO_API_KEY` | `xkeysib-xxxx...` (Brevo → Settings → API Keys) |
| `BREVO_SENDER_EMAIL` | `noreply@rideops.it` |
| `BREVO_SENDER_NAME` | `RideOps` |
| `BREVO_BASE_URL` | `https://api.brevo.com/v3` |

---

## 3. Template Brevo — ID e Oggetti

| ID Brevo | Nome Template | Utilizzo | Oggetto Email |
|----------|---------------|----------|---------------|
| `1` | email Benvenuto | Registrazione nuovo cliente | `Benvenuto in RideOps, {{params.firstName}}! 🎉` |
| `2` | Reset Password | Richiesta reset password | `Reimposta la tua password RideOps` |
| `3` | Trasferimento Servizio | Invio servizio da NCC committente a NCC esecutore | `🚐 Nuovo servizio – {{params.pickupDate}} alle {{params.pickupTime}}` |

Creare una classe `BrevoTemplates` con costanti numeriche per gli ID — niente magic numbers nel codice.

```java
public final class BrevoTemplates {
    public static final int BENVENUTO            = 1;
    public static final int RESET_PASSWORD       = 2;
    public static final int TRASFERIMENTO_NCC    = 3;
    private BrevoTemplates() {}
}
```

---

## 4. Variabili per Template

### Template `#1` — Benvenuto nuovo cliente
Inviato al momento della registrazione di un nuovo cliente (Tenant).

| Variabile Brevo | Tipo | Descrizione |
|-----------------|------|-------------|
| `params.firstName` | String | Nome del cliente |
| `params.lastName` | String | Cognome del cliente |
| `params.username` | String | Username account RideOps |
| `params.companyName` | String | Ragione sociale azienda |
| `params.email` | String | Email account |
| `params.phone` | String | Numero di telefono |
| `params.loginUrl` | String | URL della piattaforma RideOps |

---

### Template `#2` — Reset Password
Inviato quando il cliente richiede il reset della password.

| Variabile Brevo | Tipo | Descrizione |
|-----------------|------|-------------|
| `params.firstName` | String | Nome del cliente |
| `params.resetUrl` | String | Link con token generato dal BE (validità 30 min) |

---

### Template `#3` — Trasferimento Servizio NCC
Inviato al partner NCC esecutore quando riceve un servizio da un NCC committente.

| Variabile Brevo | Tipo | Descrizione |
|-----------------|------|-------------|
| `params.partnerName` | String | Nome del partner NCC esecutore |
| `params.senderCompanyName` | String | Ragione sociale NCC committente |
| `params.pickupDate` | String | Data pickup (es. `15/06/2025`) |
| `params.pickupTime` | String | Ora pickup (es. `14:30`) |
| `params.pickupAddress` | String | Indirizzo di partenza |
| `params.dropoffAddress` | String | Indirizzo di destinazione |
| `params.passengers` | String | Numero passeggeri |
| `params.clientFirstName` | String | Nome del cliente finale |
| `params.clientLastName` | String | Cognome del cliente finale |
| `params.clientCompany` | String | Ragione sociale del cliente finale |
| `params.clientPhone` | String | Telefono del cliente (cliccabile nell'email) |
| `params.notes` | String | Note speciali — **può essere stringa vuota, gestire null/empty lato BE** |

---

## 5. Flusso di Chiamata API

Endpoint Brevo: `POST https://api.brevo.com/v3/smtp/email`

Header obbligatorio: `api-key: <BREVO_API_KEY>`

Per ogni invio il BE deve:
1. Costruire il body con `sender`, `to`, `replyTo`, `templateId` e `params`
2. Aggiungere `replyTo: support@rideops.it` per permettere risposte degli utenti
3. Eseguire la chiamata HTTP con `RestClient` (Spring 6+) — nessuna dipendenza extra
4. Gestire gli errori HTTP con try/catch e loggare la risposta di errore Brevo
5. **Non passare mai HTML inline** — usare esclusivamente `templateId` + `params`

### Struttura body request

```json
{
  "sender": {
    "name": "RideOps",
    "email": "noreply@rideops.it"
  },
  "to": [
    { "email": "destinatario@esempio.it", "name": "Nome Destinatario" }
  ],
  "replyTo": {
    "email": "support@rideops.it"
  },
  "templateId": 1,
  "params": {
    "firstName": "Mario",
    "lastName": "Rossi",
    "username": "mario.rossi",
    "companyName": "Rossi NCC Srl",
    "email": "mario@rossince.it",
    "phone": "+39 333 1234567",
    "loginUrl": "https://app.rideops.it"
  }
}
```

---

## 6. Note Importanti

- `BREVO_API_KEY` non deve mai comparire nel codice sorgente o in git
- Usare `RestClient` (Spring 6+) — nessuna dipendenza extra necessaria
- Il campo `params.notes` del Template `#3` può essere null — sanitizzare prima della chiamata (passare stringa vuota se null)
- Il mittente verificato su Brevo è `noreply@rideops.it` — aggiungere sempre `replyTo: support@rideops.it`
- Usare la classe `BrevoTemplates` con costanti per gli ID — niente magic numbers
