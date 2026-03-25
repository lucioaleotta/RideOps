package com.rideops.partners.application;

import java.time.LocalDateTime;

public record PartnerEmailCommunicationResultDto(
    Long communicationId,
    Long partnerId,
    Long serviceId,
    String recipient,
    String subject,
    LocalDateTime createdAt
) {
}
