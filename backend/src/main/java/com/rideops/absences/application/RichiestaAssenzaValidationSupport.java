package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.TipoAssenzaCodice;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Regole strutturali comuni alle richieste di assenza (master §4.2, punti 1-4 e 7).
 * Configurazione effettiva, preavviso e capienza saldo sono controllati dai servizi applicativi R2/R3.
 */
final class RichiestaAssenzaValidationSupport {

    private RichiestaAssenzaValidationSupport() {
    }

    static void validate(TipoAssenzaEntity tipoAssenza,
                         OrigineRichiestaAssenza origine,
                         LocalDate dataInizio,
                         LocalDate dataFine,
                         boolean giornataIntera,
                         LocalTime oraInizio,
                         LocalTime oraFine,
                         List<RichiestaAssenzaEntity> richiesteSovrapposte) {
        if (!tipoAssenza.isAttivo()) {
            throw new AssenzaValidationException("Il tipo di assenza selezionato non è attivo");
        }

        if (TipoAssenzaCodice.SGA.name().equals(tipoAssenza.getCodice()) && origine == OrigineRichiestaAssenza.DRIVER) {
            throw new AssenzaValidationException("Il tipo Sganciamento non è richiedibile dal driver");
        }

        if (origine == OrigineRichiestaAssenza.DRIVER && !tipoAssenza.isOrigineDriverConsentita()) {
            throw new AssenzaValidationException("Il tipo di assenza selezionato non è richiedibile dal driver");
        }
        if (origine == OrigineRichiestaAssenza.GESTIONALE && !tipoAssenza.isOrigineGestionaleConsentita()) {
            throw new AssenzaValidationException("Il tipo di assenza selezionato non è inseribile dal gestionale");
        }

        if (dataInizio.isAfter(dataFine)) {
            throw new AssenzaValidationException("La data di inizio deve precedere o coincidere con la data di fine");
        }

        boolean richiedeOrario = tipoAssenza.isRichiedeOrario() || !giornataIntera;
        if (richiedeOrario) {
            if (oraInizio == null || oraFine == null) {
                throw new AssenzaValidationException("Ora di inizio e ora di fine sono obbligatorie per questa richiesta");
            }
            if (!oraInizio.isBefore(oraFine)) {
                throw new AssenzaValidationException("L'ora di inizio deve precedere l'ora di fine");
            }
        }

        if (!richiesteSovrapposte.isEmpty()) {
            throw new AssenzaValidationException("Esiste già una richiesta di assenza nello stesso periodo per questo driver");
        }
    }
}
