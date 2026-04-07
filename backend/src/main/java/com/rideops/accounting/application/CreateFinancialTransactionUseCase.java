package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import com.rideops.multitenancy.TenantContext;
import org.springframework.stereotype.Service;

@Service
public class CreateFinancialTransactionUseCase {

    private final FinancialTransactionRepositoryPort repository;
    private final FinancialTransactionValidation validation;
    private final TenantContext tenantContext;

    public CreateFinancialTransactionUseCase(FinancialTransactionRepositoryPort repository,
                                             FinancialTransactionValidation validation,
                                             TenantContext tenantContext) {
        this.repository = repository;
        this.validation = validation;
        this.tenantContext = tenantContext;
    }

    public FinancialTransactionDto execute(FinancialTransactionCommand command) {
        validation.validate(command);

        FinancialTransactionEntity entity = new FinancialTransactionEntity();
        entity.setTenantId(tenantContext.requireTenantId());
        validation.applyOnEntity(entity, command);
        entity.setAutoCreated(false);
        entity.setVoided(false);

        return FinancialTransactionMapper.toDto(repository.save(entity));
    }
}
