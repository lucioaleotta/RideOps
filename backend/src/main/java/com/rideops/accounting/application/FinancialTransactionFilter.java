package com.rideops.accounting.application;

import com.rideops.accounting.domain.FinancialTransactionCategory;
import com.rideops.accounting.domain.FinancialTransactionType;
import java.time.LocalDate;

public record FinancialTransactionFilter(
    LocalDate fromDate,
    LocalDate toDate,
    FinancialTransactionType transactionType,
    FinancialTransactionCategory category,
    Long serviceId,
    Long vehicleId,
    Long driverId,
    Long deadlineOccurrenceId,
    Boolean includeVoided,
    String sortBy,
    String direction
) {
}
