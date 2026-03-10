package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import com.rideops.accounting.domain.FinancialTransactionType;
import com.rideops.fleet.application.DeadlineOccurrencePaidEvent;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

@Service
public class AutoCreateTransactionFromPaidDeadlineOccurrenceUseCase {

    private final FinancialTransactionRepositoryPort repository;
    private final AccountingCategoryMapper categoryMapper;

    public AutoCreateTransactionFromPaidDeadlineOccurrenceUseCase(FinancialTransactionRepositoryPort repository,
                                                                  AccountingCategoryMapper categoryMapper) {
        this.repository = repository;
        this.categoryMapper = categoryMapper;
    }

    public void execute(DeadlineOccurrencePaidEvent event) {
        if (event == null || event.occurrenceId() == null) {
            return;
        }

        String sourceKey = "DEADLINE_PAID:" + event.occurrenceId();
        if (repository.findBySourceKey(sourceKey).isPresent()) {
            return;
        }

        BigDecimal amount = event.amount() == null ? BigDecimal.ZERO : event.amount();
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        FinancialTransactionEntity entity = new FinancialTransactionEntity();
        entity.setTransactionType(FinancialTransactionType.COSTO);
        entity.setCategory(categoryMapper.deadlineCostCategory(event.deadlineType()));
        entity.setDescription(event.description() == null ? "Pagamento scadenza" : event.description());
        entity.setAmount(amount.setScale(2, java.math.RoundingMode.HALF_UP));
        entity.setCurrency(event.currency() == null ? "EUR" : event.currency());
        entity.setTransactionDate(event.paymentDate() == null ? LocalDate.now() : event.paymentDate());
        entity.setVehicleId(event.vehicleId());
        entity.setDeadlineOccurrenceId(event.occurrenceId());
        entity.setAutoCreated(true);
        entity.setSourceKey(sourceKey);
        entity.setVoided(false);

        repository.save(entity);
    }
}
