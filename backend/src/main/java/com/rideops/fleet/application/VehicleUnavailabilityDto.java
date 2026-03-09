package com.rideops.fleet.application;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record VehicleUnavailabilityDto(
    Long id,
    Long vehicleId,
    LocalDate startDate,
    LocalDate endDate,
    String reason,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
