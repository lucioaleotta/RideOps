package com.rideops.fleet.application;

public record PlanSyncResultDto(
    int plansScanned,
    int plansActive,
    int occurrencesCreated,
    int occurrencesAlreadyPresent
) {
}
