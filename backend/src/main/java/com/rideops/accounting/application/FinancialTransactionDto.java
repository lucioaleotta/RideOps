package com.rideops.accounting.application;

import com.rideops.accounting.domain.FinancialTransactionCategory;
import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record FinancialTransactionDto(
    Long id,
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
    String notes,
    boolean autoCreated,
    boolean voided,
    LocalDateTime voidedAt,
    String voidReason,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
