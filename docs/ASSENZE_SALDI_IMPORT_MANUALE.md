# Saldi assenze — maturazione annuale e riconciliazione storica

## Flusso ordinario

I saldi annuali FER e PER vengono generati automaticamente dal backend, in modo idempotente, quando un saldo del driver viene letto o utilizzato nell’anno corrente. La quota è risolta secondo l’ordine di precedenza **eccezione driver → configurazione tenant → default Admin/piattaforma**. Il vincolo univoco su tenant, driver, tipo e anno evita la creazione di coorti duplicate.

- FER riceve ogni anno la quota annua effettiva; le coorti non utilizzate restano separate e la quota residua scade secondo `scadenza_ferie_mesi` (default 18 mesi dalla fine dell’anno di maturazione).
- PER riceve ogni anno la quota effettiva configurata; la coorte è spendibile nell’anno di competenza e non si riporta all’anno successivo.
- MAL, RIP, CON e SGA non ricevono un monte annuale sintetico con questa regola: seguono il proprio comportamento applicativo e di configurazione.
- Una quota pari a zero è un saldo annuale valido, non un saldo mancante.

Una modifica di configurazione salvata durante l’anno non sovrascrive automaticamente la coorte già maturata. Vale dall’anno successivo, salvo rettifica esplicita del Gestionale dalla schermata di configurazione, con anteprima e conferma. La rettifica non può portare il maturato sotto il già utilizzato. Un cambiamento dei default Admin non modifica retroattivamente le coorti esistenti.

## Riconciliazione di dati storici

L’inserimento diretto nel database è una procedura straordinaria da usare solo per trasferire uno storico approvato o correggere una discrepanza non gestibile tramite la rettifica esplicita. Va eseguito da un operatore autorizzato dopo backup e controllo dei dati. Prima di intervenire:

1. identificare tenant, driver, tipo e anno di maturazione;
2. decidere se l’import rappresenta il residuo riportato dal registro o il maturato lordo storico;
3. se si importa il maturato lordo, includere il consumo storico già avvenuto in `quantita_utilizzata`; non sottrarre una seconda volta i consumi se si importa il residuo;
4. preservare i record in `consumi_saldo_assenza` e le relative associazioni alle richieste;
5. verificare dalla pagina Driver maturato, utilizzato, residuo valido e, per FER, residuo scaduto.

Non sovrascrivere una coorte esistente con un `ON CONFLICT` alla cieca: si rischia di invalidare la riconciliazione tra maturato e consumi/storni. Gli ID e le quantità non vanno registrati nei log applicativi.

## Calcolo scadenza FER

L’API separa `residuoValido` e `residuoScaduto` usando `scadenza_ferie_mesi` effettiva (driver → tenant → piattaforma). La data limite è calcolata dalla fine dell’anno della coorte; gli altri tipi non vengono classificati come ferie scadute.
