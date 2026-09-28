package com.rideops.absences.application;

import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record RichiestaAssenzaDto(
    Long id,
    Long driverId,
    Long tipoAssenzaId,
    String tipoAssenzaCodice,
    String tipoAssenzaNome,
    OrigineRichiestaAssenza origine,
    LocalDate dataInizio,
    LocalDate dataFine,
    boolean giornataIntera,
    LocalTime oraInizio,
    LocalTime oraFine,
    StatoRichiestaAssenza stato,
    boolean richiedeApprovazioneEccezionale,
    String motivazione,
    String motivoRifiuto,
    Long approvataDa,
    LocalDateTime dataDecisione,
    LocalDateTime creatoIl,
    LocalDateTime aggiornatoIl
) {
}
