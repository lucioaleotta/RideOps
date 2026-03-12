# Manuale di Prova - RideOps

Guida operativa per gestori e driver che testano l'applicazione RideOps.

## Accesso all'Applicazione

**URL Produzione:**
```
https://rideops-frontend-9867177203.europe-west1.run.app
```

### 1. Login

1. Accedi alla pagina di login
2. Inserisci le tue credenziali fornite dal team di sviluppo
3. Clicca su **"Accedi"**
4. Verrai reindirizzato all'area personalizzata in base al tuo ruolo

#### Password Dimenticata

Se non ricordi la password:

1. Clicca su **"Password dimenticata?"** nella pagina di login
2. Inserisci il tuo indirizzo email
3. Riceverai un link di reset via email (il team di sviluppo lo comunicherà manualmente)
4. Clicca sul link ricevuto e inserisci una nuova password
5. Ritorna al login con le nuove credenziali

### 2. Area Gestori (GESTIONALE)

**Accesso:** `/app/gestionale`

#### Gestione Servizi

La sezione **"Servizi"** è il cuore dell'applicazione per i gestori.

**Visualizzare i Servizi:**
- Accedi a **Servizi** dal menu principale
- Vedrai una lista paginata di tutti i servizi
- Ogni riga mostra: ID, Data, Stato, Cliente (se assegnato)

**Creare un Nuovo Servizio:**
1. Clicca su **"+ Nuovo Servizio"** in cima alla lista
2. Compila il form:
   - **Descrizione:** dettagli del servizio (es. trasloco, consegna, ecc.)
   - **Importo:** prezzo in EUR (es. 150,50)
   - **Data:** quando deve essere eseguito
3. Clicca **"Salva"**
4. Il servizio apparirà in lista con stato **OPEN**

**Assegnare un Servizio:**
1. Clicca su un servizio con stato **OPEN**
2. Seleziona un driver dal dropdown
3. Clicca **"Assegna"**
4. Lo stato diventerà **ASSIGNED**

**Chiudere un Servizio:**
1. Seleziona un servizio con stato **ASSIGNED**
2. Clicca **"Chiudi"**
3. Il servizio passerà a stato **CLOSED** e non sarà più modificabile

**Modificare un Servizio:**
1. Clicca su un servizio **OPEN**
2. Modifica i dettagli nel form
3. Clicca **"Salva"**

#### Finance (se abilitato)

La sezione **"Finance"** mostra un riepilogo delle transazioni:
- Totale servizi completati
- Importi riscossi
- Storici per periodo

### 3. Area Driver (DRIVER)

**Accesso:** `/app/driver`

#### Visualizzare Servizi Assegnati

1. Accedi all'area Driver
2. Vedrai i servizi **ASSIGNED** a te
3. Per ogni servizio visualizzerai:
   - Descrizione
   - Data prevista
   - Importo
   - Stato (ASSIGNED)

**Nota:** Non puoi modificare lo stato direttamente — il gestore chiude i servizi completati.

### 4. Area Admin (ADMIN)

**Accesso (riservato):** `/app/admin`

L'area admin è dedicata alla gestione degli utenti e delle configurazioni di sistema. Non è necessaria per il testing base.

---

## Scenari di Test Consigliati

### Scenario 1: Ciclo Completo Servizio (Gestore)
1. ✅ Login come gestore
2. ✅ Crea un nuovo servizio
3. ✅ Assegna il servizio a un driver
4. ✅ Verifica che il driver lo veda nell'app
5. ✅ Chiudi il servizio
6. ✅ Verifica che non sia più disponibile

### Scenario 2: Visualizzazione Driver
1. ✅ Login come driver diverso
2. ✅ Visualizza i servizi assegnati
3. ✅ Controlla date e importi
4. ✅ Logout

### Scenario 3: Importi e Valute
1. ✅ Crea un servizio con importo con decimali (es. 99,99 EUR)
2. ✅ Verifica che la formattazione sia corretta in lista e dettaglio
3. ✅ Controlla che in Finance sia correttamente sommato

### Scenario 4: Ciclo Completo Login/Logout
1. ✅ Login
2. ✅ Naviga tra pagine protette
3. ✅ Clicca Logout in basso a sinistra
4. ✅ Verifica di essere reindirizzato a login
5. ✅ Ripeti login con stesse credenziali ✅

---

## Risoluzione Problemi Comuni

### "Accesso Negato" o "Non Autorizzato"

- Verifica che il tuo ruolo corrisponda all'area che stai visitando
- Driver non possono accedere a `/app/gestionale`
- Gestori non possono accedere a `/app/driver` (solo read di admin)
- Contatta il team di sviluppo se il problema persiste

### La Pagina non Carica

- Verifica la connessione internet
- Pulisci la cache del browser (Ctrl+Shift+Del o Cmd+Shift+Del)
- Prova in una finestra in incognito

### Rimango Disconnesso Improvvisamente

- La sessione scade dopo un periodo di inattività
- Fai login di nuovo
- Se è un problema ricorrente, contatta il team

### Importi non Visualizzati Correttamente

- Accertati di usare il formato `XXX,XX` (virgola come separatore decimale in italiano)
- Ricaricare la pagina (F5)

---

## Note Tecniche

- **Sessione:** La sessione dura 60+ minuti di inattività
- **Browser Supportati:** Chrome, Firefox, Safari, Edge (versioni recenti)
- **Cookies:** L'app usa cookies httpOnly per sicurezza — assicurati che siano abilitati
- **Formato Data:** Segui il formato della tupla data locale (es. DD/MM/YYYY)
- **Valuta:** Tutti gli importi sono in **EUR** (Euro)

---

## Contatti Supporto

Per segnalazioni su bug o domande tecniche:
- Apri un issue su GitHub
- Contatta il team di sviluppo

**Buon testing! 🚀**
