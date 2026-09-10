# Report QA Admin

Data test: 2026-09-10  
Ambiente: locale (`http://localhost:5173`)  
Ruolo verificato: `ADMIN`  
Credenziali: non memorizzate nel report

## Riepilogo

| Area | Esito | Note |
| --- | --- | --- |
| Login ADMIN | PASS | Accesso riuscito e redirect a `/app` |
| App shell ADMIN | PASS | Visibili Dashboard, User Admin e Clienti |
| Admin home | PASS | Nessun overflow orizzontale a desktop e mobile |
| User Admin | PASS | Filtri richiudibili; paginazione presente; nessun overflow desktop |
| Gestione Clienti desktop | PASS | Tabella e paginazione dentro i limiti del viewport |
| Gestione Clienti mobile | PASS | Lista a schede e paginazione funzionanti senza overflow |
| Login GESTIONALE | PASS | Accesso riuscito e redirect a `/app` |
| Home GESTIONALE desktop | PASS | Agenda e cambio vista calendario disponibili |
| Home GESTIONALE mobile | PASS | Menu mobile presente e nessun overflow orizzontale |
| Navigazione aree GESTIONALE desktop | PARTIAL | Route raggiunte senza overflow; alcuni dati restano in caricamento |
| Navigazione aree GESTIONALE mobile | PASS | Route principali raggiunte senza overflow e menu mobile presente |

## Test eseguiti

### Autenticazione

- Apertura di `/login`.
- Compilazione dei campi User ID e Password.
- Invio tramite `Accedi`.
- Risultato: redirect a `/app`; shell autenticata visibile.

### App shell ADMIN

- Verifica dei link di navigazione:
  - Dashboard: `/app/admin-home`
  - User Admin: `/app/admin`
  - Clienti: `/app/admin/tenants`
- Risultato: tutti i link sono presenti nel menu ADMIN.

### Dashboard accessi

Viewport desktop: 1275px.  
Viewport mobile: 375px.

- Verificati titolo, card KPI e sezioni principali.
- Verificato `scrollWidth === clientWidth` in entrambi i viewport.
- Risultato: PASS, nessun overflow orizzontale rilevato.

### User Admin

Viewport desktop: 1440px.

- Verificata apertura del pannello `Mostra filtri`.
- Verificata chiusura tramite `Nascondi filtri`.
- Verificata presenza della paginazione con `Precedente`, indicatore pagina e `Successiva`.
- Verificato `scrollWidth === clientWidth`.
- Nota: il primo controllo può mostrare temporaneamente lo stato `Caricamento utenti...`; il test va considerato dopo il completamento della chiamata API.
- Risultato: PASS.

### Gestione Clienti

Viewport mobile: 375px.

- Verificato titolo e lista tenant a schede.
- Verificato riepilogo `Mostrando 1 - 10 di 12 clienti`.
- Premuto `Pagina successiva`.
- Risultato: riepilogo aggiornato a `Mostrando 11 - 12 di 12 clienti`; visualizzate 2 schede; pulsante successivo disabilitato.
- Verificato `scrollWidth === clientWidth`.

Viewport desktop: 1440px.

- Verificata tabella tenant.
- Verificata paginazione con solo `Precedente` e `Successiva`, senza pulsanti numerici.
- Verificato `scrollWidth === clientWidth` e assenza di overflow nella card tabella.
- Risultato: PASS.

## Anomalie e rischi residui

- Il caricamento dati è asincrono: le verifiche automatiche devono attendere la risposta API prima di valutare conteggi, righe e paginazione.
- Non è ancora stato verificato il ruolo `DRIVER`.
- Non sono ancora stati testati i flussi di creazione/modifica tenant, modifica utenti, journal e gestione errori API.

## Test ruolo GESTIONALE

### Autenticazione e autorizzazioni

- Login con il ruolo gestionale riuscito.
- Redirect a `/app` con pagina `Agenda Servizi`.
- Menu verificato: Home, Servizi, Finanza, Parco mezzi, Gestione Partner e Gestione Personale.
- Le voci amministrative ADMIN non risultano esposte nel menu.

### Agenda Servizi

Viewport desktop: 1425px.  
Viewport mobile: 390px.

- Verificati i comandi `Prec.`, `Oggi`, `Succ.`.
- Verificate le viste `Mese`, `Settimana` e `Giorno`.
- Cambio da `Mese` a `Settimana` eseguito correttamente.
- Verificati i filtri Driver, Stato e Tipologia.
- Verificato `scrollWidth === clientWidth` su desktop e mobile.
- Verificata la presenza del menu mobile nel viewport stretto.
- Risultato: PASS.

Nota: il calendario utilizza caricamento asincrono; la verifica dei servizi visualizzati deve essere eseguita dopo la conclusione della chiamata API.

### Copertura aree operative

Route raggiunte con il ruolo `GESTIONALE`:

- `/app/services`
- `/app/finance`
- `/app/finance/movements`
- `/app/finance/partner-payments`
- `/app/fleet`
- `/app/partners`
- `/app/gestionale`

Controlli comuni eseguiti su desktop e mobile:

- route raggiungibile;
- titolo principale presente;
- menu mobile presente nel viewport stretto;
- `scrollWidth === clientWidth`;
- assenza di messaggi di errore UI espliciti.

Risultati:

- Flotta e Partner mostrano correttamente lo stato vuoto/dati disponibili.
- Gestione Personale completa il caricamento dopo attesa prolungata in alcune esecuzioni e mostra i driver.
- Servizi resta su `Caricamento servizi...` dopo oltre 7 secondi, senza messaggio di errore; i filtri e `Nuovo servizio` sono visibili, ma la lista non è validabile.
- Finanza e alcune sottosezioni mostrano inizialmente `Caricamento dati finanziari...`; serve una verifica backend mirata per distinguere latenza da errore di endpoint.

### Anomalia QA aperta

**QA-GEST-001 - Caricamento prolungato servizi**  
Severità: media, perché blocca la consultazione e la gestione dei servizi.  
Riproduzione: login come GESTIONALE, aprire `/app/services`, attendere oltre 7 secondi.  
Atteso: lista servizi, contatori e stato vuoto/righe disponibili oppure errore esplicito.  
Osservato: `Caricamento servizi...` persistente senza feedback di errore.

## Prossimi scenari

1. Diagnosticare `QA-GEST-001` verificando endpoint e risposta API servizi.
2. Completare test ruolo `DRIVER`.
3. Test CRUD tenant e utenti.
4. Test validazioni, stati vuoti, errori di rete e sessione scaduta.
5. Verifica accessibilità da tastiera e comportamento su viewport intermedi.
