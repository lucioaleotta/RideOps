package com.rideops.services.application;

import java.time.LocalDateTime;

public record ServicePartnerCommunicationDto(
    Long communicationId,
    String channel,
    String recipient,
    String subject,
    LocalDateTime createdAt
) {
}
