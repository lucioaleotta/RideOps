package com.rideops.services.domain;

public class RideService {

    private ServiceStatus status;

    public RideService(ServiceStatus status) {
        this.status = status == null ? ServiceStatus.OPEN : status;
    }

    public ServiceStatus getStatus() {
        return status;
    }

    public void assign() {
        transitionTo(ServiceStatus.ASSIGNED);
    }

    public void execute() {
        transitionTo(ServiceStatus.EXECUTED);
    }

    public void close() {
        transitionTo(ServiceStatus.CLOSED);
    }

    public void closeManuallyAfterPartnerConfirmation() {
        if (status != ServiceStatus.OPEN) {
            throw new ServiceDomainException("La chiusura manuale da OPEN è consentita solo per servizi OPEN");
        }
        status = ServiceStatus.CLOSED;
    }

    public void transitionTo(ServiceStatus targetStatus) {
        if (!status.canTransitionTo(targetStatus)) {
            throw new ServiceDomainException("Transizione non valida: " + status + " -> " + targetStatus);
        }
        status = targetStatus;
    }
}