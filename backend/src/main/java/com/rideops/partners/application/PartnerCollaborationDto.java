package com.rideops.partners.application;

import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PartnerCollaborationDto(
    Long serviceId,
    String internalBookingReference,
    LocalDateTime startAt,
    String pickupLocation,
    String destination,
    ServiceType serviceType,
    ServiceStatus status,
    ServiceAssignmentType serviceAssignmentType,
    String clientName,
    String clientPhone,
    String clientEmail,
    Integer passengersCount,
    String itinerary,
    BigDecimal pricePartner,
    long emailCommunicationCount,
    LocalDateTime lastEmailCommunicationAt
) {
}
