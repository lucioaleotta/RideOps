package com.rideops.accounting.application;

import com.rideops.accounting.domain.FinancialTransactionCategory;
import java.math.BigDecimal;

public record CategorySummaryItemDto(
    FinancialTransactionCategory category,
    BigDecimal total
) {
}
