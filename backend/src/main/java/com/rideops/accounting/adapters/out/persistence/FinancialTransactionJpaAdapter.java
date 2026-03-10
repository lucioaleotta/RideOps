package com.rideops.accounting.adapters.out.persistence;

import com.rideops.accounting.application.FinancialTransactionFilter;
import com.rideops.accounting.application.FinancialTransactionRepositoryPort;
import com.rideops.accounting.domain.FinancialTransactionType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

@Component
public class FinancialTransactionJpaAdapter implements FinancialTransactionRepositoryPort {

    private final FinancialTransactionRepository repository;

    public FinancialTransactionJpaAdapter(FinancialTransactionRepository repository) {
        this.repository = repository;
    }

    @Override
    public FinancialTransactionEntity save(FinancialTransactionEntity entity) {
        return repository.save(entity);
    }

    @Override
    public Optional<FinancialTransactionEntity> findById(Long id) {
        return repository.findById(id);
    }

    @Override
    public Optional<FinancialTransactionEntity> findBySourceKey(String sourceKey) {
        return repository.findBySourceKey(sourceKey);
    }

    @Override
    public List<FinancialTransactionEntity> findByFilter(FinancialTransactionFilter filter) {
        Specification<FinancialTransactionEntity> specification = Specification.where(null);

        if (filter.fromDate() != null) {
            specification = specification.and((root, query, cb) -> cb.greaterThanOrEqualTo(
                root.get("transactionDate"),
                filter.fromDate()
            ));
        }

        if (filter.toDate() != null) {
            specification = specification.and((root, query, cb) -> cb.lessThan(
                root.get("transactionDate"),
                filter.toDate().plusDays(1)
            ));
        }

        if (filter.transactionType() != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("transactionType"), filter.transactionType()));
        }

        if (filter.category() != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("category"), filter.category()));
        }

        if (filter.serviceId() != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("serviceId"), filter.serviceId()));
        }

        if (filter.vehicleId() != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("vehicleId"), filter.vehicleId()));
        }

        if (filter.driverId() != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("driverId"), filter.driverId()));
        }

        if (filter.deadlineOccurrenceId() != null) {
            specification = specification.and((root, query, cb) -> cb.equal(
                root.get("deadlineOccurrenceId"),
                filter.deadlineOccurrenceId()
            ));
        }

        boolean includeVoided = Boolean.TRUE.equals(filter.includeVoided());
        if (!includeVoided) {
            specification = specification.and((root, query, cb) -> cb.isFalse(root.get("voided")));
        }

        Sort.Direction direction = "asc".equalsIgnoreCase(filter.direction()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortBy = switch (filter.sortBy() == null ? "transactionDate" : filter.sortBy()) {
            case "amount" -> "amount";
            case "createdAt" -> "createdAt";
            case "category" -> "category";
            default -> "transactionDate";
        };

        return repository.findAll(specification, Sort.by(direction, sortBy).and(Sort.by(Sort.Direction.DESC, "id")));
    }

    @Override
    public List<FinanceTypeTotalProjection> summarizeByTypeInRange(LocalDate fromDate, LocalDate toDate) {
        return repository.summarizeByTypeInRange(fromDate, toDate);
    }

    @Override
    public List<FinanceYearMonthTotalProjection> summarizeMonthlyByYear(int year) {
        return repository.summarizeMonthlyByYear(year);
    }

    @Override
    public List<FinanceYearTotalProjection> summarizeYearly() {
        return repository.summarizeYearly();
    }

    @Override
    public List<FinanceCategoryTotalProjection> summarizeByCategoryInRange(FinancialTransactionType type,
                                                                           LocalDate fromDate,
                                                                           LocalDate toDate) {
        return repository.summarizeByCategoryInRange(type, fromDate, toDate);
    }

    @Override
    public long countDistinctServicesWithTransactions(LocalDate fromDate, LocalDate toDate) {
        return repository.countDistinctServicesWithTransactions(fromDate, toDate);
    }
}
