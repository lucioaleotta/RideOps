package com.rideops.fleet.application;

public class DeadlineNotFoundException extends RuntimeException {

    public DeadlineNotFoundException(Long deadlineId) {
        super("Deadline not found: " + deadlineId);
    }
}
