package com.rideops.services.application;

import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import com.rideops.services.domain.ServiceAssignmentType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ServiceDto(
    Long id,
    LocalDateTime startAt,
    String pickupLocation,
    String destination,
    ServiceType type,
    Integer durationHours,
    String notes,
    BigDecimal price,
    Long externalBookingReference,
    String internalBookingReference,
    String clientName,
    String clientPhone,
    String clientEmail,
    Integer passengersCount,
    String itinerary,
    ServiceStatus status,
    Long assignedDriverId,
    Long assignedVehicleId,
    Long assignedByUserId,
    LocalDateTime assignedAt,
    ServiceAssignmentType serviceAssignmentType,
    Long partnerId,
    BigDecimal pricePartner,
    BigDecimal margin,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}