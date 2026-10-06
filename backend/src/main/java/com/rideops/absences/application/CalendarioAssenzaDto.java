package com.rideops.absences.application;

import com.rideops.absences.domain.OrigineRichiestaAssenza;
import java.time.LocalDate;
import java.time.LocalTime;

public record CalendarioAssenzaDto(
    Long richiestaId,
    Long driverId,
    Long tipoAssenzaId,
    String tipoAssenzaCodice,
    String tipoAssenzaNome,
    LocalDate dataInizio,
    LocalDate dataFine,
    boolean giornataIntera,
    LocalTime oraInizio,
    LocalTime oraFine,
    OrigineRichiestaAssenza origine,
    boolean richiedeApprovazioneEccezionale
) {
}