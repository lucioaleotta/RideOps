package com.rideops.accounting.adapters.out.persistence;

import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.BigDecimal;

public interface FinanceYearMonthTotalProjection {
    Integer getYear();

    Integer getMonth();

    FinancialTransactionType getTransactionType();

    BigDecimal getTotalAmount();
}
