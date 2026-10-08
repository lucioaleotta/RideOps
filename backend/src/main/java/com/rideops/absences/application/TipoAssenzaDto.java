package com.rideops.absences.application;

import com.rideops.absences.domain.UnitaMisuraAssenza;
import java.math.BigDecimal;

public record TipoAssenzaDto(
    Long id,
    String codice,
    String nome,
    UnitaMisuraAssenza unitaMisura,
    boolean origineDriverConsentita,
    boolean origineGestionaleConsentita,
    boolean richiedeOrario,
    boolean richiedeDocumentoDefault,
    boolean scalaDaMonteOreDefault,
    int preavvisoMinimoGiorniDefault,
    BigDecimal numeroGiorniAnnuiDefault,
    BigDecimal numeroGiorniMalattiaAnnuiDefault,
    Integer scadenzaMesiAccumuloDefault,
    boolean attivo
) {
}
