package com.rideops.partners.application;

import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PartnerAssignableServiceDto(
    Long serviceId,
    String internalBookingReference,
    LocalDateTime startAt,
    String pickupLocation,
    String destination,
    ServiceType serviceType,
    String clientName,
    String clientPhone,
    String clientEmail,
    Integer passengersCount,
    String itinerary,
    BigDecimal price
) {
}
