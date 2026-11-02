package com.rideops.absences.application;

import java.time.LocalDateTime;

public record ConflittoTurnoAssenzaDto(
    Long servizioId,
    LocalDateTime inizio,
    Integer durataOre,
    String partenza,
    String destinazione
) {
}