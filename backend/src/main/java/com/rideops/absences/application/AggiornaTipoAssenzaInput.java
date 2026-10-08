package com.rideops.absences.application;

import com.rideops.absences.domain.UnitaMisuraAssenza;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AggiornaTipoAssenzaInput(
    @NotBlank String nome,
    @NotNull UnitaMisuraAssenza unitaMisura,
    @NotNull Boolean richiedeOrario,
    @NotNull Boolean richiedeDocumentoDefault,
    @NotNull Boolean scalaDaMonteOreDefault,
    @NotNull @Min(0) Integer preavvisoMinimoGiorniDefault,
    BigDecimal numeroGiorniAnnuiDefault,
    BigDecimal numeroGiorniMalattiaAnnuiDefault,
    Integer scadenzaMesiAccumuloDefault
) {
}