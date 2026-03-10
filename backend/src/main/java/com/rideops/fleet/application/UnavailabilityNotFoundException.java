package com.rideops.fleet.application;

public class UnavailabilityNotFoundException extends RuntimeException {

    public UnavailabilityNotFoundException(Long unavailabilityId) {
        super("Unavailability not found: " + unavailabilityId);
    }
}
