package com.rideops.fleet.application;

import com.rideops.fleet.domain.VehicleType;
import java.time.LocalDateTime;

public record VehicleDto(
    Long id,
    String plate,
    Integer seats,
    VehicleType type,
    String notes,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
