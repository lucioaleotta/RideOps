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
            throw new ServiceValidationException("Il servizio non puo` essere creato con stato CLOSED");
        }
        return safeStatus;
    }

    static void validateBusinessFields(ServiceType type,
                                       Integer durationHours,
                                       String pickupLocation,
                                       String destination) {
        if (type == null) {
            throw new ServiceValidationException("Il tipo e` obbligatorio");
        }
        if (pickupLocation == null || pickupLocation.isBlank()) {
            throw new ServiceValidationException("Il luogo di partenza e` obbligatorio");
        }
        if (destination == null || destination.isBlank()) {
            throw new ServiceValidationException("La destinazione e` obbligatoria");
        }
        if (type == ServiceType.TOUR && (durationHours == null || durationHours <= 0)) {
            throw new ServiceValidationException("Per TOUR la durata in ore e` obbligatoria");
        }
        if (type == ServiceType.TRANSFER && durationHours != null && durationHours <= 0) {
            throw new ServiceValidationException("La durata in ore deve essere positiva quando valorizzata");
        }
    }

    static void validateRequestedTransition(ServiceStatus currentStatus, ServiceStatus targetStatus) {
        if (targetStatus == null || currentStatus == targetStatus) {
            return;
        }
        if (targetStatus == ServiceStatus.CLOSED) {
            throw new ServiceValidationException("Usa l'endpoint di chiusura per chiudere un servizio");
        }
        RideService service = new RideService(currentStatus);
        try {
            service.transitionTo(targetStatus);
        } catch (ServiceDomainException exception) {
            throw new ServiceValidationException("Transizione di stato non valida");
        }
    }
}