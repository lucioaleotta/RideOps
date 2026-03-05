package com.rideops.services.application;

public class ServiceNotFoundException extends RuntimeException {

    public ServiceNotFoundException(Long serviceId) {
        super("Service not found: " + serviceId);
    }
}