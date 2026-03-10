package com.rideops.accounting.application;

public class FinancialTransactionNotFoundException extends RuntimeException {

    public FinancialTransactionNotFoundException(Long id) {
        super("Financial transaction not found: " + id);
    }
}
