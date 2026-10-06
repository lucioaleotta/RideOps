package com.rideops.services.application;

import java.time.LocalDateTime;

public record DriverServiceConflict(
    Long serviceId,
    LocalDateTime startAt,
    Integer durationHours,
    String pickupLocation,
    String destination
) {
}