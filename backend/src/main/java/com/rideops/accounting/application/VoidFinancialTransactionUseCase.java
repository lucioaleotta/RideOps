package com.rideops.accounting.application;

import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class VoidFinancialTransactionUseCase {

    private final FinancialTransactionRepositoryPort repository;

    public VoidFinancialTransactionUseCase(FinancialTransactionRepositoryPort repository) {
        this.repository = repository;
    }

    public FinancialTransactionDto execute(Long id, String reason) {
        var entity = repository.findById(id)
            .orElseThrow(() -> new FinancialTransactionNotFoundException(id));

        if (entity.isVoided()) {
            return FinancialTransactionMapper.toDto(entity);
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new FinancialValidationException("Void reason is required");
        }

        entity.setVoided(true);
        entity.setVoidedAt(LocalDateTime.now());
        entity.setVoidReason(reason.trim());

        return FinancialTransactionMapper.toDto(repository.save(entity));
    }
}
