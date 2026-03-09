package com.rideops.fleet.application;

public class DeadlinePlanNotFoundException extends RuntimeException {

    public DeadlinePlanNotFoundException(Long planId) {
        super("Plan not found: " + planId);
    }
}
