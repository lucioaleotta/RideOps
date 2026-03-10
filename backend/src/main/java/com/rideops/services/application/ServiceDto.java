package com.rideops.services.application;

import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
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
    ServiceStatus status,
    Long assignedDriverId,
    Long assignedVehicleId,
    Long assignedByUserId,
    LocalDateTime assignedAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}