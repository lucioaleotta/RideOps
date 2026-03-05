package com.rideops.services.domain;

public enum ServiceStatus {
    OPEN,
    ASSIGNED,
    CLOSED;

    public boolean canTransitionTo(ServiceStatus targetStatus) {
        if (targetStatus == null) {
            return false;
        }
        if (this == targetStatus) {
            return true;
        }
        return switch (this) {
            case OPEN -> targetStatus == ASSIGNED;
            case ASSIGNED -> targetStatus == CLOSED;
            case CLOSED -> false;
        };
    }
}