package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;

public final class ServiceMapper {

    private ServiceMapper() {
    }

    public static ServiceDto toDto(RideServiceEntity entity) {
        return new ServiceDto(
            entity.getId(),
            entity.getStartAt(),
            entity.getPickupLocation(),
            entity.getDestination(),
            entity.getType(),
            entity.getDurationHours(),
            entity.getNotes(),
            entity.getPrice(),
            entity.getStatus(),
            entity.getAssignedDriverId(),
            entity.getAssignedByUserId(),
            entity.getAssignedAt(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}