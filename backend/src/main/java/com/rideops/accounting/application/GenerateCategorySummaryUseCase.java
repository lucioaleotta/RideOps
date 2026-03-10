package com.rideops.accounting.application;

import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class GenerateCategorySummaryUseCase {

    private final FinancialTransactionRepositoryPort repository;

    public GenerateCategorySummaryUseCase(FinancialTransactionRepositoryPort repository) {
        this.repository = repository;
    }

    public List<CategorySummaryItemDto> execute(int year, Integer month, FinancialTransactionType type) {
        LocalDate from = LocalDate.of(year, month == null ? 1 : month, 1);
        LocalDate to = month == null ? from.plusYears(1) : from.plusMonths(1);

        FinancialTransactionType safeType = type == null ? FinancialTransactionType.COSTO : type;

        return repository.summarizeByCategoryInRange(safeType, from, to).stream()
            .map(item -> new CategorySummaryItemDto(
                item.getCategory(),
                (item.getTotalAmount() == null ? java.math.BigDecimal.ZERO : item.getTotalAmount()).setScale(2, RoundingMode.HALF_UP)
            ))
            .toList();
    }
}
