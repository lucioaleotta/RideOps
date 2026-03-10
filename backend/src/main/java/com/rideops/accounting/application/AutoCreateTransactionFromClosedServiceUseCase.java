package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import com.rideops.accounting.domain.FinancialTransactionType;
import com.rideops.services.application.ServiceClosedEvent;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

@Service
public class AutoCreateTransactionFromClosedServiceUseCase {

    private final FinancialTransactionRepositoryPort repository;
    private final AccountingCategoryMapper categoryMapper;

    public AutoCreateTransactionFromClosedServiceUseCase(FinancialTransactionRepositoryPort repository,
                                                         AccountingCategoryMapper categoryMapper) {
        this.repository = repository;
        this.categoryMapper = categoryMapper;
    }

    public void execute(ServiceClosedEvent event) {
        if (event == null || event.serviceId() == null) {
            return;
        }

        String sourceKey = "SERVICE_CLOSED:" + event.serviceId();
        if (repository.findBySourceKey(sourceKey).isPresent()) {
            return;
        }

        BigDecimal amount = event.amount() == null ? BigDecimal.ZERO : event.amount();
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        FinancialTransactionEntity entity = new FinancialTransactionEntity();
        entity.setTransactionType(FinancialTransactionType.RICAVO);
        entity.setCategory(categoryMapper.serviceRevenueCategory(event.serviceType()));
        entity.setDescription(event.description() == null ? "Incasso servizio" : event.description());
        entity.setAmount(amount.setScale(2, java.math.RoundingMode.HALF_UP));
        entity.setCurrency(event.currency() == null ? "EUR" : event.currency());
        entity.setTransactionDate(event.closedDate() == null ? LocalDate.now() : event.closedDate());
        entity.setServiceId(event.serviceId());
        entity.setVehicleId(event.assignedVehicleId());
        entity.setDriverId(event.assignedDriverId());
        entity.setAutoCreated(true);
        entity.setSourceKey(sourceKey);
        entity.setVoided(false);

        repository.save(entity);
    }
}
