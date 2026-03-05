package com.rideops.services.application;

import com.rideops.services.domain.RideService;
import com.rideops.services.domain.ServiceDomainException;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;

final class ServiceValidationSupport {

    private ServiceValidationSupport() {
    }

    static ServiceStatus sanitizeCreateStatus(ServiceStatus status) {
        ServiceStatus safeStatus = status == null ? ServiceStatus.OPEN : status;
        if (safeStatus == ServiceStatus.CLOSED) {
            throw new ServiceValidationException("Service cannot be created as CLOSED");
        }
        return safeStatus;
    }

    static void validateBusinessFields(ServiceType type,
                                       Integer durationHours,
                                       String pickupLocation,
                                       String destination) {
        if (type == null) {
            throw new ServiceValidationException("Type is required");
        }
        if (pickupLocation == null || pickupLocation.isBlank()) {
            throw new ServiceValidationException("Pickup location is required");
        }
        if (destination == null || destination.isBlank()) {
            throw new ServiceValidationException("Destination is required");
        }
        if (type == ServiceType.TOUR && (durationHours == null || durationHours <= 0)) {
            throw new ServiceValidationException("Duration hours is required for TOUR");
        }
        if (type == ServiceType.TRANSFER && durationHours != null && durationHours <= 0) {
            throw new ServiceValidationException("Duration hours must be positive when provided");
        }
    }

    static void validateRequestedTransition(ServiceStatus currentStatus, ServiceStatus targetStatus) {
        if (targetStatus == null || currentStatus == targetStatus) {
            return;
        }
        if (targetStatus == ServiceStatus.CLOSED) {
            throw new ServiceValidationException("Use close endpoint to close a service");
        }
        RideService service = new RideService(currentStatus);
        try {
            service.transitionTo(targetStatus);
        } catch (ServiceDomainException exception) {
            throw new ServiceValidationException("Invalid status transition");
        }
    }
}