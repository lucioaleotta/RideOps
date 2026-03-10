package com.rideops.fleet.application;

import com.rideops.fleet.domain.DeadlineType;
import java.math.BigDecimal;
import java.time.LocalDate;

public record DeadlineOccurrenceCompletedEvent(
    Long occurrenceId,
    Long vehicleId,
    DeadlineType deadlineType,
    BigDecimal amount,
    String currency,
    LocalDate executionDate,
    String description
) {
}
