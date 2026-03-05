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

    public void close() {
        transitionTo(ServiceStatus.CLOSED);
    }

    public void transitionTo(ServiceStatus targetStatus) {
        if (!status.canTransitionTo(targetStatus)) {
            throw new ServiceDomainException("Invalid transition: " + status + " -> " + targetStatus);
        }
        status = targetStatus;
    }
}