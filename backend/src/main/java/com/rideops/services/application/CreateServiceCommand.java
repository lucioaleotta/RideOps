package com.rideops.services.application;

import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CreateServiceCommand(
    LocalDateTime startAt,
    String pickupLocation,
    String destination,
    ServiceType type,
    Integer durationHours,
    String notes,
    BigDecimal price,
    Long externalBookingReference,
    String clientName,
    String clientPhone,
    String clientEmail,
    Integer passengersCount,
    String itinerary,
    ServiceStatus status,
    Long assignedVehicleId,
    Boolean overrideVehicleDayConflict,
    Boolean overrideVehicleMaintenanceConflict
) {
}