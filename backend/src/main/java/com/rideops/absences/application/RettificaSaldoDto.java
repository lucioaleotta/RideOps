package com.rideops.absences.application;

import java.math.BigDecimal;

public record RettificaSaldoDto(
    Long driverId,
    Long tipoAssenzaId,
    String codice,
    String nome,
    int anno,
    BigDecimal maturatoAttuale,
    BigDecimal giaUtilizzato,
    BigDecimal quotaConfigurata,
    BigDecimal maturatoDopoRettifica,
    BigDecimal differenza,
    boolean applicabile
) {
}
