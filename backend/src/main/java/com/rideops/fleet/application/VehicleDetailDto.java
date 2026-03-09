package com.rideops.fleet.application;

import java.util.List;

public record VehicleDetailDto(
    VehicleDto vehicle,
    int upcomingCount,
    int overdueCount,
    List<VehicleDeadlineOccurrenceDto> occurrences,
    List<VehicleDeadlinePlanDto> plans
) {
}
