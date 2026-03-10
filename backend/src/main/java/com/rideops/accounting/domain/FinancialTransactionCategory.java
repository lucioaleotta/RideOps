package com.rideops.accounting.domain;

import java.util.Arrays;

public enum FinancialTransactionCategory {
    SERVIZIO(FinancialTransactionType.RICAVO),
    SERVIZIO_ESTERNO(FinancialTransactionType.RICAVO),
    EXTRA(FinancialTransactionType.RICAVO),
    ALTRO_RICAVO(FinancialTransactionType.RICAVO),
    CARBURANTE(FinancialTransactionType.COSTO),
    BOLLO(FinancialTransactionType.COSTO),
    ASSICURAZIONE(FinancialTransactionType.COSTO),
    REVISIONE(FinancialTransactionType.COSTO),
    TAGLIANDO(FinancialTransactionType.COSTO),
    MANUTENZIONE_ORDINARIA(FinancialTransactionType.COSTO),
    MANUTENZIONE_STRAORDINARIA(FinancialTransactionType.COSTO),
    PEDAGGIO(FinancialTransactionType.COSTO),
    PARCHEGGIO(FinancialTransactionType.COSTO),
    COMMISSIONE(FinancialTransactionType.COSTO),
    ALTRO_COSTO(FinancialTransactionType.COSTO);

    private final FinancialTransactionType type;

    FinancialTransactionCategory(FinancialTransactionType type) {
        this.type = type;
    }

    public FinancialTransactionType getType() {
        return type;
    }

    public static boolean isCompatible(FinancialTransactionType type, FinancialTransactionCategory category) {
        return category != null && category.type == type;
    }

    public static FinancialTransactionCategory[] categoriesForType(FinancialTransactionType type) {
        return Arrays.stream(values())
            .filter(item -> item.type == type)
            .toArray(FinancialTransactionCategory[]::new);
    }
}
