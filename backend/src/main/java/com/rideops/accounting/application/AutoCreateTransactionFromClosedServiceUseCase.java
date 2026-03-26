package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import com.rideops.accounting.domain.FinancialTransactionType;
import com.rideops.services.application.ServiceClosedEvent;
import com.rideops.services.domain.ServiceAssignmentType;
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

        // INCOMING services are not recorded as company revenue (partner owns the revenue)
        if (event.serviceAssignmentType() == ServiceAssignmentType.INCOMING) {
            return;
        }

        String sourceKey = "SERVICE_CLOSED:" + event.serviceId();
        if (repository.findBySourceKey(sourceKey).isPresent()) {
            return;
        }

        // For OUTSOURCED, use margin; for INTERNAL or others, use full price
        BigDecimal amount = determineAmount(event);
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
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

    private BigDecimal determineAmount(ServiceClosedEvent event) {
        if (event.serviceAssignmentType() == ServiceAssignmentType.OUTSOURCED) {
            // For outsourced services, record the margin
            return event.margin() == null ? BigDecimal.ZERO : event.margin();
        }
        // For INTERNAL and others, use the full price
        return event.amount() == null ? BigDecimal.ZERO : event.amount();
    }
}
