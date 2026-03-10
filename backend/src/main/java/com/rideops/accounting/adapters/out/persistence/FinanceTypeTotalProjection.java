package com.rideops.accounting.adapters.out.persistence;

import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.BigDecimal;

public interface FinanceTypeTotalProjection {
    FinancialTransactionType getTransactionType();

    BigDecimal getTotalAmount();
}
