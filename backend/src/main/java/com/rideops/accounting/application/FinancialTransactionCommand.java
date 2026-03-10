package com.rideops.accounting.application;

import com.rideops.accounting.domain.FinancialTransactionCategory;
import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;

public record FinancialTransactionCommand(
    FinancialTransactionType transactionType,
    FinancialTransactionCategory category,
    String description,
    BigDecimal amount,
    String currency,
    LocalDate transactionDate,
    Long serviceId,
    Long vehicleId,
    Long driverId,
    Long deadlineOccurrenceId,
    String notes
) {
}
