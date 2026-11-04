# Analisi — ottimizzazione polling RideOps

## Stato attuale osservato

- `AppShell` contiene tre polling a 30 secondi: flotta (`GET /api/fleet/vehicles` più una GET `/detail` per veicolo), richieste assenza (`/pending-count`) e badge servizi (unassigned per Gestionale, servizi Driver con finestra odierna + tre giorni).
- La flotta emette `fleet-alerts-refresh` due volte su `window` e `document`; `AppShell` ascolta entrambi i target. Il censimento non ha trovato un event bus applicativo per refresh; gli altri listener DOM trovati gestiscono comportamenti locali di menu/dialogo.
- Access Control esegue sei GET ogni 60 secondi e una GET separata a `/api/admin/tenants`; filtri e ricerca attualmente riavviano il caricamento senza debounce e cancellazione.
- La pagina admin monta condizionalmente Access Control solo quando è selezionata la tab. Questa definizione di dashboard attiva viene mantenuta: component montato sulla route `/app/admin-home` e tab Access Control attiva.
- Il layout protetto risolve il ruolo via `/auth/me`; la risposta backend contiene `id`, `userId`, `email`, `role`, `tenantId`. Il polling verrà legato a una chiave sessione composta da id, tenant e ruolo, mai dal token.
- `OwnerSessionsController` applica già `@PreAuthorize("hasRole('ADMIN')")` a tutte le rotte `/owner/sessions`; anche `AdminTenantController` è protetto da ruolo ADMIN. Il frontend mantiene il gating e i proxy inoltrano l'abort; la verifica HTTP 403 end-to-end resta nella suite backend/integrazione esistente da eseguire.
- Il badge flotta usa i conteggi `upcomingCount`/`overdueCount` ottenuti dal dettaglio veicolo. Le occorrenze e i veicoli sono filtrati per tenant tramite `TenantContext`; la nuova aggregazione riutilizzerà questo confine.

## Decisioni e limiti

- **Endpoint aggregato flotta: incluso.** La stima media/attesa della flotta reale non è disponibile. I seed demo indicano 4 veicoli, ma non dimostrano che tutte le flotte siano strutturalmente sotto 10; pertanto non è possibile motivare l’omissione prevista dal criterio.
- **Dashboard attiva:** mount condizionale della tab esistente su `/app/admin-home`, non un flag globale o una route approssimata.
- **Timezone:** il codice di scadenza usa `LocalDate.now()` e non consulta la timezone del tenant, sebbene questa sia memorizzata. La modifica conserva la semantica backend attuale e l'endpoint aggregato restituisce `ZoneId.systemDefault()`; il client pianifica il cambio data usando esattamente quel fuso, senza assumere che coincida con il timezone del browser. Rimane una scelta di dominio da valutare separatamente se il timezone del tenant dovrebbe invece governare le date.
- **Isolamento:** stati e timestamp restano in hook/componenti; identità, tenant e ruolo entrano nella chiave lifecycle. Nessuna cache condivisa o token in contesto.

## Modifiche pianificate

1. Hook polling con timeout ricorsivo dopo completion, abort, visibilità, soglia al resume, backoff configurabile ed arresto su 401/403.
2. Badge a 15 min / 5 min / 60 s; refresh post-azione; unico `window` event namespaced con coalescing; endpoint flotta aggregato.
3. Access Control gated da sessione ADMIN, tab montata e scheda visibile; debounce ricerca e guardia anti-race.
4. Test deterministici per gli scenari principali e misurazione Network a parità di scenario, da effettuare dopo la disponibilità dell'ambiente.

## Stato dell'implementazione

- Implementato `usePolling` con timeout ricorsivo, timeout richiesta a 30 s, abort, visibility/resume, backoff configurabile e stop su 401/403.
- Aggiornati i badge con frequenze richieste, invalidazione per utente/tenant/ruolo, eventi di refresh namespaced e refresh immediati post-azione.
- Implementato l'endpoint aggregato flotta tenant-scoped; restituisce anche il timezone effettivo del processo backend per il refresh al cambio data.
- Access Control è condizionato al ruolo Admin autenticato nel context dell'AppShell; la dashboard è attiva solo quando montata sulla tab, usa debounce ricerca 450 ms, abort e guardia sequence/sessione. I proxy propagano il segnale di cancellazione.
- Aggiunti test frontend per il lifecycle/backoff del polling e il gating ruolo Access Control, oltre a test backend per aggregazione e endpoint. Non sono stati eseguiti.
- Build, lint e test non sono stati eseguiti; anche la misurazione Network prima/dopo resta da effettuare con scenari a parità di condizioni.

## Rischi e verifiche residue

- Il timezone del tenant non governa attualmente il calcolo date di flotta; la schedulazione client replica il timezone del processo backend comunicato dall'endpoint aggregato.
- L'abort dal browser può non interrompere il lavoro già avviato nel backend; i controlli di identità/sequence-id impediranno comunque che la risposta precedente aggiorni il nuovo stato client.
- La misurazione prima/dopo richiede scenari eseguiti con la stessa durata, stesse azioni e numero di veicoli; non è sostituibile da una stima statica.
- Secondo le istruzioni del repository, build e test automatici sono eseguiti dall'utente, non dall'agente.
