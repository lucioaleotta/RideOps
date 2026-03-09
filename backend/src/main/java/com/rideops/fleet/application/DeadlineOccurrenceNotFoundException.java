package com.rideops.fleet.application;

public class DeadlineOccurrenceNotFoundException extends RuntimeException {

    public DeadlineOccurrenceNotFoundException(Long occurrenceId) {
        super("Occurrence not found: " + occurrenceId);
    }
}
