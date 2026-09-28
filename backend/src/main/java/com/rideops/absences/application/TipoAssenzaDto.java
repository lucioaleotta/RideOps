package com.rideops.absences.application;

import com.rideops.absences.domain.UnitaMisuraAssenza;

public record TipoAssenzaDto(
    Long id,
    String codice,
    String nome,
    UnitaMisuraAssenza unitaMisura,
    boolean origineDriverConsentita,
    boolean origineGestionaleConsentita,
    boolean richiedeOrario,
    int preavvisoMinimoGiorniDefault,
    boolean attivo
) {
}
