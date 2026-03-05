package com.rideops.services.application;

public class ServiceValidationException extends RuntimeException {

    public ServiceValidationException(String message) {
        super(message);
    }
}