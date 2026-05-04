package com.rideops.services.application;

import com.rideops.services.domain.ServiceAssignmentType;
import java.math.BigDecimal;
import java.util.List;

public record ServicePartnerHistoryDto(
    Long serviceId,
    ServiceAssignmentType serviceAssignmentType,
    Long partnerId,
    String partnerRagioneSociale,
    String partnerEmail,
    BigDecimal pricePartner,
    BigDecimal margin,
    Long outgoingPartnerId,
    String outgoingPartnerRagioneSociale,
    String outgoingPartnerEmail,
    List<ServicePartnerCommunicationDto> communications
) {
}
