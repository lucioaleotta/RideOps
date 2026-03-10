package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import org.springframework.stereotype.Service;

@Service
public class CreateFinancialTransactionUseCase {

    private final FinancialTransactionRepositoryPort repository;
    private final FinancialTransactionValidation validation;

    public CreateFinancialTransactionUseCase(FinancialTransactionRepositoryPort repository,
                                             FinancialTransactionValidation validation) {
        this.repository = repository;
        this.validation = validation;
    }

    public FinancialTransactionDto execute(FinancialTransactionCommand command) {
        validation.validate(command);

        FinancialTransactionEntity entity = new FinancialTransactionEntity();
        validation.applyOnEntity(entity, command);
        entity.setAutoCreated(false);
        entity.setVoided(false);

        return FinancialTransactionMapper.toDto(repository.save(entity));
    }
}
