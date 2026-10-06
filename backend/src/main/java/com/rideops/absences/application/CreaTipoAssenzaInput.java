package com.rideops.absences.application;

import com.rideops.absences.domain.UnitaMisuraAssenza;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import org.springframework.lang.NonNull;

public record CreaTipoAssenzaInput(
    @NonNull @NotBlank @Pattern(regexp = "[A-Z0-9]{2,10}") String codice,
    @NotBlank String nome,
    @NotNull UnitaMisuraAssenza unitaMisura,
    @NotNull Boolean origineDriverConsentita,
    @NotNull Boolean origineGestionaleConsentita,
    @NotNull Boolean richiedeOrario,
    @NotNull Boolean richiedeDocumentoDefault,
    @NotNull Boolean scalaDaMonteOreDefault,
    @NotNull @Min(0) Integer preavvisoMinimoGiorniDefault,
    BigDecimal numeroGiorniAnnuiDefault,
    BigDecimal numeroGiorniMalattiaAnnuiDefault,
    Integer scadenzaFerieMesiDefault
) {
}