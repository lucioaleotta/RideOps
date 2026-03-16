package com.rideops.accounting.application;

public class FinancialTransactionNotFoundException extends RuntimeException {

    public FinancialTransactionNotFoundException(Long id) {
        super("Transazione finanziaria non trovata: " + id);
    }
}
