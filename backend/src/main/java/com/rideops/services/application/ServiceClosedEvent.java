package com.rideops.services.application;

import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ServiceClosedEvent(
    Long serviceId,
    Long assignedVehicleId,
    Long assignedDriverId,
    ServiceType serviceType,
    ServiceAssignmentType serviceAssignmentType,
    BigDecimal amount,
    BigDecimal margin,
    String currency,
    LocalDate closedDate,
    String description
) {
}
