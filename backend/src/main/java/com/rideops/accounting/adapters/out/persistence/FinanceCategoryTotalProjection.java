package com.rideops.accounting.adapters.out.persistence;

import com.rideops.accounting.domain.FinancialTransactionCategory;
import java.math.BigDecimal;

public interface FinanceCategoryTotalProjection {
    FinancialTransactionCategory getCategory();

    BigDecimal getTotalAmount();
}
