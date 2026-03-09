package com.rideops.fleet.application;

import com.rideops.fleet.domain.DeadlineType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record VehicleDeadlinePlanDto(
    Long id,
    Long vehicleId,
    DeadlineType type,
    String title,
    String description,
    Integer recurrenceMonths,
    LocalDate nextDueDate,
    BigDecimal standardCost,
    String currency,
    Boolean active,
    String notes,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
