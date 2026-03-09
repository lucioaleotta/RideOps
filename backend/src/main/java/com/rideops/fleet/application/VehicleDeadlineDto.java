package com.rideops.fleet.application;

import com.rideops.fleet.domain.DeadlineType;
import com.rideops.fleet.domain.DeadlineStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record VehicleDeadlineDto(
    Long id,
    Long vehicleId,
    DeadlineType type,
    String title,
    String description,
    LocalDate dueDate,
    DeadlineStatus status,
    BigDecimal cost,
    String currency,
    String notes,
    LocalDate paymentDate,
    LocalDate executionDate,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
