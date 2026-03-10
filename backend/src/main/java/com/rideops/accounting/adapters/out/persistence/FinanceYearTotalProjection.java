package com.rideops.accounting.adapters.out.persistence;

import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.BigDecimal;

public interface FinanceYearTotalProjection {
    Integer getYear();

    FinancialTransactionType getTransactionType();

    BigDecimal getTotalAmount();
}
