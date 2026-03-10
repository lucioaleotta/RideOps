package com.rideops.fleet.application;

public class VehicleNotFoundException extends RuntimeException {

    public VehicleNotFoundException(Long vehicleId) {
        super("Vehicle not found: " + vehicleId);
    }
}
