package com.rideops.absences.application;

import java.time.LocalDateTime;

public record AuditTipoAssenzaDto(
    Long id,
    String adminUserId,
    Long tipoAssenzaId,
    String codice,
    String azione,
    String valoriPrecedenti,
    String valoriNuovi,
    LocalDateTime creatoIl
) {
}