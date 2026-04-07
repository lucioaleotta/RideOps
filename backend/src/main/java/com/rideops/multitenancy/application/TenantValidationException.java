package com.rideops.multitenancy.application;

public class TenantValidationException extends RuntimeException {

    public TenantValidationException(String message) {
        super(message);
    }
}
