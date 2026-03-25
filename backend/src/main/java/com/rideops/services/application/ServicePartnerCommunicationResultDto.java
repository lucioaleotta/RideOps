package com.rideops.services.application;

import java.time.LocalDateTime;

public record ServicePartnerCommunicationResultDto(
    Long communicationId,
    Long serviceId,
    Long partnerId,
    String recipient,
    String subject,
    LocalDateTime createdAt
) {
}
