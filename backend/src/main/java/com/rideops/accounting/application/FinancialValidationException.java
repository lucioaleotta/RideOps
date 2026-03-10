package com.rideops.accounting.application;

public class FinancialValidationException extends RuntimeException {

    public FinancialValidationException(String message) {
        super(message);
    }
}
