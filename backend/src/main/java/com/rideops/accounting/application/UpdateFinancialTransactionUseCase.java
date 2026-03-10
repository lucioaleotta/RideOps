package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import org.springframework.stereotype.Service;

@Service
public class UpdateFinancialTransactionUseCase {

    private final FinancialTransactionRepositoryPort repository;
    private final FinancialTransactionValidation validation;

    public UpdateFinancialTransactionUseCase(FinancialTransactionRepositoryPort repository,
                                             FinancialTransactionValidation validation) {
        this.repository = repository;
        this.validation = validation;
    }

    public FinancialTransactionDto execute(Long id, FinancialTransactionCommand command) {
        validation.validate(command);

        FinancialTransactionEntity entity = repository.findById(id)
            .orElseThrow(() -> new FinancialTransactionNotFoundException(id));

        if (entity.isVoided()) {
            throw new FinancialValidationException("Voided transaction cannot be updated");
        }

        validation.applyOnEntity(entity, command);
        return FinancialTransactionMapper.toDto(repository.save(entity));
    }
}
