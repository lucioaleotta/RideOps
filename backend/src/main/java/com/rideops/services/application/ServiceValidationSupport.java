package com.rideops.services.application;

import com.rideops.services.domain.RideService;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceDomainException;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;

final class ServiceValidationSupport {

    private ServiceValidationSupport() {
    }

    static ServiceStatus sanitizeCreateStatus(ServiceStatus status) {
        ServiceStatus safeStatus = status == null ? ServiceStatus.OPEN : status;
        if (safeStatus == ServiceStatus.CLOSED || safeStatus == ServiceStatus.EXECUTED) {
            throw new ServiceValidationException("Il servizio non puo` essere creato con stato ESEGUITO/CLOSED");
        }
        return safeStatus;
    }

    static ServiceAssignmentType sanitizeCreateAssignmentType(ServiceAssignmentType assignmentType) {
        return assignmentType == null ? ServiceAssignmentType.INTERNAL : assignmentType;
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
        if ((type == ServiceType.TRANSFER || type == ServiceType.DISPOSIZIONE) && durationHours != null && durationHours <= 0) {
            throw new ServiceValidationException("La durata in ore deve essere positiva quando valorizzata");
        }
    }

    static void validateRequestedTransition(ServiceStatus currentStatus, ServiceStatus targetStatus) {
        if (targetStatus == null || currentStatus == targetStatus) {
            return;
        }
        if (targetStatus == ServiceStatus.EXECUTED || targetStatus == ServiceStatus.CLOSED) {
            throw new ServiceValidationException("Usa gli endpoint dedicati per segnare ESEGUITO o chiudere un servizio");
        }
        RideService service = new RideService(currentStatus);
        try {
            service.transitionTo(targetStatus);
        } catch (ServiceDomainException exception) {
            throw new ServiceValidationException("Transizione di stato non valida");
        }
    }

    static void validatePassengersCount(Integer passengersCount) {
        if (passengersCount != null && passengersCount <= 0) {
            throw new ServiceValidationException("Il numero passeggeri deve essere positivo");
        }
    }

    static void validateAssignmentBusinessRules(ServiceAssignmentType assignmentType,
                                                Long partnerId,
                                                BigDecimal pricePartner) {
        ServiceAssignmentType safeType = sanitizeCreateAssignmentType(assignmentType);

        if (safeType == ServiceAssignmentType.INTERNAL) {
            if (partnerId != null || pricePartner != null) {
                throw new ServiceValidationException("Per servizi INTERNAL partner e prezzo partner non sono ammessi");
            }
            return;
        }

        if (safeType == ServiceAssignmentType.OUTSOURCED) {
            if (partnerId == null) {
                throw new ServiceValidationException("Il partner e` obbligatorio per servizi OUTSOURCED/INCOMING");
            }
            if (pricePartner == null || pricePartner.signum() < 0) {
                throw new ServiceValidationException("Il prezzo partner e` obbligatorio e non negativo per OUTSOURCED");
            }
            return;
        }

        if (safeType == ServiceAssignmentType.INCOMING) {
            if (partnerId == null) {
                throw new ServiceValidationException("Il partner e` obbligatorio per servizi OUTSOURCED/INCOMING");
            }
            if (pricePartner != null && pricePartner.signum() < 0) {
                throw new ServiceValidationException("Il prezzo partner non puo` essere negativo");
            }
            return;
        }

        if (safeType == ServiceAssignmentType.INCOMING_OUTSOURCED) {
            // In update mode i partner incoming/outgoing possono essere modificati o azzerati.
            if (pricePartner != null && pricePartner.signum() < 0) {
                throw new ServiceValidationException("Il prezzo partner non puo` essere negativo");
            }
            return;
        }

        if (pricePartner != null && pricePartner.signum() < 0) {
            throw new ServiceValidationException("Il prezzo partner non puo` essere negativo");
        }
    }

    static void validateAssignmentTransition(ServiceAssignmentType currentType, ServiceAssignmentType targetType) {
        ServiceAssignmentType safeCurrent = sanitizeCreateAssignmentType(currentType);
        ServiceAssignmentType safeTarget = sanitizeCreateAssignmentType(targetType);

        if (safeCurrent == ServiceAssignmentType.INCOMING && safeTarget == ServiceAssignmentType.INTERNAL) {
            throw new ServiceValidationException("Un servizio INCOMING non puo` diventare INTERNAL");
        }
        if (safeCurrent == ServiceAssignmentType.INCOMING_OUTSOURCED && safeTarget == ServiceAssignmentType.INTERNAL) {
            throw new ServiceValidationException("Un servizio INCOMING_OUTSOURCED non puo` diventare INTERNAL");
        }
        if (safeCurrent == ServiceAssignmentType.INCOMING_OUTSOURCED && safeTarget == ServiceAssignmentType.OUTSOURCED) {
            throw new ServiceValidationException("Un servizio INCOMING_OUTSOURCED non puo` diventare OUTSOURCED");
        }
    }

    static boolean isPartnerManaged(ServiceAssignmentType assignmentType) {
        ServiceAssignmentType safeType = sanitizeCreateAssignmentType(assignmentType);
        return safeType == ServiceAssignmentType.OUTSOURCED
            || safeType == ServiceAssignmentType.INCOMING_OUTSOURCED;
    }

    static BigDecimal calculateMargin(BigDecimal servicePrice, BigDecimal pricePartner) {
        if (servicePrice == null || pricePartner == null) {
            return null;
        }
        return servicePrice.subtract(pricePartner);
    }
}