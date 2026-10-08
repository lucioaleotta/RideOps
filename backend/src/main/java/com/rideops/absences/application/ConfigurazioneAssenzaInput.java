package com.rideops.absences.application;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ConfigurazioneAssenzaInput(
    @NotNull Boolean abilitato,
    @NotNull Boolean richiedeDocumento,
    @NotNull Boolean monteOreAbilitato,
    BigDecimal numeroGiorniAnnui,
    BigDecimal numeroGiorniMalattiaAnnui,
    String comportamentoMaturato,
    Integer scadenzaMesiAccumulo,
    @NotNull Integer preavvisoMinimoGiorni,
    String noteConfigurazione
) {
}