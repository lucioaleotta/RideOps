package com.rideops.absences.application;

import java.math.BigDecimal;

public record ConfigurazioneAssenzaDto(
    Long tipoAssenzaId,
    String codice,
    String nome,
    String unitaMisura,
    boolean richiedeOrario,
    boolean personalizzato,
    boolean abilitato,
    boolean richiedeDocumento,
    boolean monteOreAbilitato,
    BigDecimal numeroGiorniAnnui,
    BigDecimal numeroGiorniMalattiaAnnui,
    String comportamentoMaturato,
    Integer scadenzaMesiAccumulo,
    int preavvisoMinimoGiorni,
    String noteConfigurazione,
    ConfigurazioneAssenzaInput defaultPiattaforma
) {
}