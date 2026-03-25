package com.rideops.partners.application;

import com.rideops.partners.domain.PartnerType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PartnerDto(
    Long id,
    PartnerType type,
    String ragioneSociale,
    String nomeReferente,
    String cognomeReferente,
    String telefono,
    String email,
    String citta,
    String indirizzo,
    String zonaOperativa,
    String partitaIva,
    String codiceFiscale,
    String iban,
    String intestatarioConto,
    String notePagamenti,
    long numeroServiziAffidati,
    long numeroServiziRicevuti,
    BigDecimal totaleMarginiOutsourced,
    BigDecimal totaleRicaviIncoming,
    BigDecimal totaleGuadagni,
    BigDecimal saldoAttuale,
    BigDecimal totaleCrediti,
    BigDecimal totaleDebiti,
    boolean riceveEmail,
    boolean riceveWhatsApp,
    String telefonoWhatsApp,
    String noteOperative,
    boolean deleted,
    LocalDateTime deletedAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
