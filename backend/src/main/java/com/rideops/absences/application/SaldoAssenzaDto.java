package com.rideops.absences.application;

import java.math.BigDecimal;

public record SaldoAssenzaDto(
    Long tipoAssenzaId,
    String codice,
    String nome,
    String unitaMisura,
    BigDecimal quantitaMaturata,
    BigDecimal quantitaUtilizzata,
    BigDecimal residuoValido,
    BigDecimal residuoScaduto,
    boolean saldoAnnuale,
    boolean saldoCaricato,
    boolean monteOreAbilitato,
    String comportamentoMaturato,
    Integer scadenzaMesiAccumulo
) {
}