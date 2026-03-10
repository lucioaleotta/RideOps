package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;

public final class FinancialTransactionMapper {

    private FinancialTransactionMapper() {
    }

    public static FinancialTransactionDto toDto(FinancialTransactionEntity entity) {
        return new FinancialTransactionDto(
            entity.getId(),
            entity.getTransactionType(),
            entity.getCategory(),
            entity.getDescription(),
            entity.getAmount(),
            entity.getCurrency(),
            entity.getTransactionDate(),
            entity.getServiceId(),
            entity.getVehicleId(),
            entity.getDriverId(),
            entity.getDeadlineOccurrenceId(),
            entity.getNotes(),
            entity.isAutoCreated(),
            entity.isVoided(),
            entity.getVoidedAt(),
            entity.getVoidReason(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
