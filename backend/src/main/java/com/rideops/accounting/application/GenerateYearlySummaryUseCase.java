package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinanceYearTotalProjection;
import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Service;

@Service
public class GenerateYearlySummaryUseCase {

    private final FinancialTransactionRepositoryPort repository;

    public GenerateYearlySummaryUseCase(FinancialTransactionRepositoryPort repository) {
        this.repository = repository;
    }

    public List<YearlyFinancePointDto> execute() {
        List<FinanceYearTotalProjection> rows = repository.summarizeYearly();
        Map<Integer, BigDecimal> revenueByYear = new TreeMap<>();
        Map<Integer, BigDecimal> costByYear = new TreeMap<>();

        for (FinanceYearTotalProjection row : rows) {
            if (row.getYear() == null) {
                continue;
            }
            BigDecimal total = safe(row.getTotalAmount());
            if (row.getTransactionType() == FinancialTransactionType.RICAVO) {
                revenueByYear.put(row.getYear(), total);
            } else if (row.getTransactionType() == FinancialTransactionType.COSTO) {
                costByYear.put(row.getYear(), total);
            }
        }

        List<YearlyFinancePointDto> result = new ArrayList<>();
        for (Integer year : revenueByYear.keySet()) {
            BigDecimal revenue = revenueByYear.getOrDefault(year, zero());
            BigDecimal costs = costByYear.getOrDefault(year, zero());
            result.add(new YearlyFinancePointDto(year, revenue, costs, revenue, revenue.subtract(costs).setScale(2, RoundingMode.HALF_UP)));
        }

        for (Integer year : costByYear.keySet()) {
            if (revenueByYear.containsKey(year)) {
                continue;
            }
            BigDecimal costs = costByYear.getOrDefault(year, zero());
            result.add(new YearlyFinancePointDto(year, zero(), costs, zero(), zero().subtract(costs).setScale(2, RoundingMode.HALF_UP)));
        }

        result.sort((left, right) -> Integer.compare(left.year(), right.year()));
        return result;
    }

    private BigDecimal zero() {
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? zero() : value.setScale(2, RoundingMode.HALF_UP);
    }
}
